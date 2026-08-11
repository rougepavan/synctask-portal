package com.taskportal.backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskportal.backend.dto.AiResponse;
import com.taskportal.backend.models.Task;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiService {
    private static final Logger logger = LoggerFactory.getLogger(AiService.class);

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public AiResponse generateTaskDetails(String title) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.warn("Gemini API key is not configured. Falling back to local rule-based suggestions.");
            return getFallbackSuggestion(title);
        }

        String prompt = "You are a professional task generator. Analyze the task title: \"" + title + "\". " +
                "Generate a detailed, helpful task description with 5 step-by-step action items. " +
                "Suggest a realistic priority: LOW, MEDIUM, or HIGH. " +
                "Estimate the completion effort in hours (as an integer). " +
                "Format your response as a single valid JSON object with the exact keys: 'description', 'priority', and 'estimatedHours'. " +
                "Example output: {\"description\": \"Analyze customer feedback data and draft a summary.\", \"priority\": \"MEDIUM\", \"estimatedHours\": 4} " +
                "Output ONLY the JSON object. Do not include markdown formatting or backticks (e.g. do not wrap in ```json).";

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> partsMap = new HashMap<>();
        partsMap.put("parts", List.of(textPart));

        Map<String, Object> contentsMap = new HashMap<>();
        contentsMap.put("contents", List.of(partsMap));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(contentsMap, headers);

        // List of endpoints to attempt in order
        List<String> endpointUrls = List.of(
            apiUrl,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
        );

        for (String targetUrl : endpointUrls) {
            try {
                String requestUrl = targetUrl.contains("?") ? (targetUrl + "&key=" + apiKey) : (targetUrl + "?key=" + apiKey);
                ResponseEntity<String> response = restTemplate.postForEntity(requestUrl, requestEntity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    String textResponse = root.path("candidates")
                            .path(0)
                            .path("content")
                            .path("parts")
                            .path(0)
                            .path("text")
                            .asText();

                    if (textResponse != null && !textResponse.isBlank()) {
                        return parseGeminiJsonResponse(textResponse, title);
                    }
                }
            } catch (Exception e) {
                // Try next endpoint in loop
            }
        }

        logger.info("External AI API endpoints unavailable, seamlessly using title-tailored rule generator.");
        return getFallbackSuggestion(title);
    }

    public Map<String, String> generateTaskSummary(List<Task> tasks) {
        long completed = tasks.stream().filter(t -> "DONE".equals(t.getStatus().name())).count();
        long pending = tasks.size() - completed;
        long highPriority = tasks.stream().filter(t -> "HIGH".equals(t.getPriority().name()) && !"DONE".equals(t.getStatus().name())).count();

        String summaryText;
        String productivityAdvice;

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                String prompt = "You are a productivity AI assistant. Summarize this user's task status: " +
                        "Total tasks: " + tasks.size() + ", Completed: " + completed + ", Pending: " + pending + ", High Priority Pending: " + highPriority + ". " +
                        "Provide 2 concise paragraphs: Paragraph 1 summarizing status, Paragraph 2 giving actionable productivity advice. Output as JSON with keys 'summary' and 'advice'.";

                Map<String, Object> textPart = Map.of("text", prompt);
                Map<String, Object> partsMap = Map.of("parts", List.of(textPart));
                Map<String, Object> contentsMap = Map.of("contents", List.of(partsMap));

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(contentsMap, headers);
                String requestUrl = apiUrl + "?key=" + apiKey;
                ResponseEntity<String> response = restTemplate.postForEntity(requestUrl, requestEntity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    String textResponse = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText().trim();
                    if (textResponse.startsWith("```")) {
                        textResponse = textResponse.replaceAll("^```(json)?", "").replaceAll("```$", "").trim();
                    }
                    JsonNode parsed = objectMapper.readTree(textResponse);
                    summaryText = parsed.path("summary").asText();
                    productivityAdvice = parsed.path("advice").asText();

                    Map<String, String> res = new HashMap<>();
                    res.put("summary", summaryText);
                    res.put("advice", productivityAdvice);
                    return res;
                }
            } catch (Exception e) {
                logger.error("Failed to generate AI summary, using fallback: {}", e.getMessage());
            }
        }

        // Fallback summary
        summaryText = "Productivity Summary: You have completed " + completed + " out of " + tasks.size() + " tasks (" +
                (tasks.isEmpty() ? 0 : (completed * 100 / tasks.size())) + "% completion rate). " + pending + " tasks remain in your queue.";
        
        if (highPriority > 0) {
            productivityAdvice = "High Priority Alert: You have " + highPriority + " high-priority task(s) pending. Focus on tackling urgent items first to optimize workflow momentum.";
        } else if (pending > 0) {
            productivityAdvice = "Great steady pace! Clear remaining pending items during high-energy focus blocks.";
        } else {
            productivityAdvice = "All tasks completed! Excellent work maintaining a clear workspace.";
        }

        Map<String, String> res = new HashMap<>();
        res.put("summary", summaryText);
        res.put("advice", productivityAdvice);
        return res;
    }

    private AiResponse parseGeminiJsonResponse(String textResponse, String title) {
        try {
            String cleanedJson = textResponse.trim();
            if (cleanedJson.startsWith("```")) {
                cleanedJson = cleanedJson.replaceAll("^```(json)?", "");
                cleanedJson = cleanedJson.replaceAll("```$", "");
                cleanedJson = cleanedJson.trim();
            }

            JsonNode parsedNode = objectMapper.readTree(cleanedJson);
            String description = parsedNode.path("description").asText("No description generated.");
            
            String priority = parsedNode.path("priority").asText("MEDIUM").toUpperCase();
            if (!priority.equals("LOW") && !priority.equals("MEDIUM") && !priority.equals("HIGH")) {
                priority = "MEDIUM";
            }
            
            int estimatedHours = parsedNode.path("estimatedHours").asInt(2);
            if (estimatedHours <= 0) {
                estimatedHours = 2;
            }

            return new AiResponse(description, priority, estimatedHours);
        } catch (Exception e) {
            logger.error("Failed to parse JSON response from Gemini: {}", e.getMessage());
            return getFallbackSuggestion(title);
        }
    }

    private AiResponse getFallbackSuggestion(String title) {
        String lowerTitle = title.toLowerCase();
        String priority;
        int estimatedHours;
        String description;

        // ── Presentation / Reports ──────────────────────────────────────────
        if (lowerTitle.contains("presentation") || lowerTitle.contains("slide") || lowerTitle.contains("deck")) {
            priority = "HIGH";
            estimatedHours = 4;
            description = "Task: " + title + "\n\n"
                + "Objective: Deliver a compelling, structured presentation that clearly communicates key insights to the target audience.\n\n"
                + "Action Items:\n"
                + "1. Define the audience, goals, and core message for the presentation.\n"
                + "2. Gather and validate all data, charts, and supporting materials.\n"
                + "3. Design slides with clean layout, clear headings, and visual hierarchy.\n"
                + "4. Rehearse delivery at least twice and incorporate peer feedback.\n"
                + "5. Prepare a Q&A brief and backup slides for likely questions.";

        // ── Bug Fixes / Critical Prod Issues ───────────────────────────────
        } else if (lowerTitle.contains("bug") || lowerTitle.contains("fix") || lowerTitle.contains("critical")
                || lowerTitle.contains("urgent") || lowerTitle.contains("hotfix") || lowerTitle.contains("patch")) {
            priority = "HIGH";
            estimatedHours = 5;
            description = "Task: " + title + "\n\n"
                + "Objective: Identify the root cause of the reported issue and deliver a verified, production-safe fix.\n\n"
                + "Action Items:\n"
                + "1. Reproduce the bug in a local or staging environment with exact steps.\n"
                + "2. Analyze logs, stack traces, and recent code changes to isolate root cause.\n"
                + "3. Implement the minimal-viable fix with defensive coding practices.\n"
                + "4. Write or update unit/integration tests to prevent regression.\n"
                + "5. Deploy fix to staging for QA sign-off, then push to production with monitoring.";

        // ── Database / Migration ────────────────────────────────────────────
        } else if (lowerTitle.contains("database") || lowerTitle.contains("migration") || lowerTitle.contains("schema")
                || lowerTitle.contains("sql") || lowerTitle.contains("index")) {
            priority = "HIGH";
            estimatedHours = 6;
            description = "Task: " + title + "\n\n"
                + "Objective: Safely execute database changes with zero downtime and full rollback capability.\n\n"
                + "Action Items:\n"
                + "1. Backup production database before initiating any schema changes.\n"
                + "2. Write migration scripts (Flyway/Liquibase) and validate on staging.\n"
                + "3. Run EXPLAIN ANALYZE on all affected queries to check query plans.\n"
                + "4. Create indexes on foreign keys and frequent filter columns.\n"
                + "5. Test rollback script and document migration steps in runbook.";

        // ── Auth / Security ────────────────────────────────────────────────
        } else if (lowerTitle.contains("auth") || lowerTitle.contains("login") || lowerTitle.contains("security")
                || lowerTitle.contains("jwt") || lowerTitle.contains("password") || lowerTitle.contains("oauth")) {
            priority = "HIGH";
            estimatedHours = 5;
            description = "Task: " + title + "\n\n"
                + "Objective: Implement or harden authentication/authorization to meet security compliance standards.\n\n"
                + "Action Items:\n"
                + "1. Review current auth flow and identify vulnerabilities (OWASP Top 10 check).\n"
                + "2. Implement secure token handling — short-lived JWTs with refresh token rotation.\n"
                + "3. Enforce password complexity policies and hash with BCrypt (cost ≥12).\n"
                + "4. Add rate limiting and account lockout after repeated failed attempts.\n"
                + "5. Conduct penetration test and document security controls in architecture doc.";

        // ── API / Backend Development ──────────────────────────────────────
        } else if (lowerTitle.contains("api") || lowerTitle.contains("endpoint") || lowerTitle.contains("backend")
                || lowerTitle.contains("service") || lowerTitle.contains("rest")) {
            priority = "MEDIUM";
            estimatedHours = 4;
            description = "Task: " + title + "\n\n"
                + "Objective: Design, implement, and document a reliable, versioned API endpoint.\n\n"
                + "Action Items:\n"
                + "1. Define request/response contract (OpenAPI/Swagger spec).\n"
                + "2. Implement controller, service, and repository layers with proper separation.\n"
                + "3. Add input validation, error handling, and meaningful HTTP status codes.\n"
                + "4. Write integration tests covering happy path, edge cases, and error responses.\n"
                + "5. Update Postman collection and API documentation.";

        // ── UI / Frontend / Design ─────────────────────────────────────────
        } else if (lowerTitle.contains("ui") || lowerTitle.contains("frontend") || lowerTitle.contains("design")
                || lowerTitle.contains("layout") || lowerTitle.contains("dashboard") || lowerTitle.contains("page")) {
            priority = "MEDIUM";
            estimatedHours = 4;
            description = "Task: " + title + "\n\n"
                + "Objective: Implement a pixel-perfect, accessible, and responsive UI component or page.\n\n"
                + "Action Items:\n"
                + "1. Review Figma/design spec and list all UI states (default, hover, active, error).\n"
                + "2. Build component with responsive breakpoints (mobile → tablet → desktop).\n"
                + "3. Ensure WCAG 2.1 AA accessibility (keyboard nav, ARIA labels, color contrast).\n"
                + "4. Cross-browser test in Chrome, Firefox, and Safari.\n"
                + "5. Optimize bundle size and ensure no layout shifts (CLS < 0.1).";

        // ── Testing / QA ───────────────────────────────────────────────────
        } else if (lowerTitle.contains("test") || lowerTitle.contains("qa") || lowerTitle.contains("unit")
                || lowerTitle.contains("e2e") || lowerTitle.contains("coverage")) {
            priority = "MEDIUM";
            estimatedHours = 3;
            description = "Task: " + title + "\n\n"
                + "Objective: Increase test coverage and validate system behavior under various conditions.\n\n"
                + "Action Items:\n"
                + "1. Identify untested critical paths and edge cases from code review.\n"
                + "2. Write unit tests for service/business logic (JUnit/Mockito or Jest/RTL).\n"
                + "3. Add integration tests for API endpoints with realistic data scenarios.\n"
                + "4. Configure CI pipeline to enforce minimum 80% code coverage threshold.\n"
                + "5. Document test strategy and known limitations.";

        // ── Research / Analysis / Survey ────────────────────────────────────
        } else if (lowerTitle.contains("research") || lowerTitle.contains("survey") || lowerTitle.contains("analysis")
                || lowerTitle.contains("study") || lowerTitle.contains("explore") || lowerTitle.contains("evaluate")) {
            priority = "LOW";
            estimatedHours = 6;
            description = "Task: " + title + "\n\n"
                + "Objective: Conduct structured research to gather insights and deliver actionable recommendations.\n\n"
                + "Action Items:\n"
                + "1. Define research questions, success criteria, and scope boundaries.\n"
                + "2. Identify and compile primary sources (papers, docs, tools, competitors).\n"
                + "3. Synthesize findings and map them to current project requirements.\n"
                + "4. Build a comparison matrix or proof-of-concept where applicable.\n"
                + "5. Present findings in a structured report with recommendations and next steps.";

        // ── Documentation ──────────────────────────────────────────────────
        } else if (lowerTitle.contains("document") || lowerTitle.contains("wiki") || lowerTitle.contains("readme")
                || lowerTitle.contains("guide") || lowerTitle.contains("runbook")) {
            priority = "LOW";
            estimatedHours = 2;
            description = "Task: " + title + "\n\n"
                + "Objective: Create clear, comprehensive documentation that enables team members to onboard and operate independently.\n\n"
                + "Action Items:\n"
                + "1. Identify the target audience (developers, ops, end-users) and adjust tone accordingly.\n"
                + "2. Structure content with clear headings, prerequisites, and step-by-step instructions.\n"
                + "3. Add code samples, screenshots, and architecture diagrams where relevant.\n"
                + "4. Peer review by 1-2 team members unfamiliar with the topic.\n"
                + "5. Publish to Confluence/Notion/README and set a review reminder for 3 months.";

        // ── Deployment / DevOps / CI/CD ─────────────────────────────────────
        } else if (lowerTitle.contains("deploy") || lowerTitle.contains("release") || lowerTitle.contains("ci")
                || lowerTitle.contains("devops") || lowerTitle.contains("docker") || lowerTitle.contains("pipeline")) {
            priority = "HIGH";
            estimatedHours = 4;
            description = "Task: " + title + "\n\n"
                + "Objective: Execute a safe, automated deployment with rollback strategy in place.\n\n"
                + "Action Items:\n"
                + "1. Verify all pre-deployment checklist items (tests passing, secrets configured, changelog updated).\n"
                + "2. Deploy to staging environment and run smoke tests.\n"
                + "3. Coordinate scheduled maintenance window and notify stakeholders.\n"
                + "4. Execute blue-green or rolling deployment to production.\n"
                + "5. Monitor error rates, latency, and system health for 30 minutes post-deployment.";

        // ── Gaming / Hardware / Setup ─────────────────────────────────────
        } else if (lowerTitle.contains("gaming") || lowerTitle.contains("setup") || lowerTitle.contains("pc")
                || lowerTitle.contains("hardware") || lowerTitle.contains("desk") || lowerTitle.contains("monitor")) {
            priority = "MEDIUM";
            estimatedHours = 5;
            description = "Task: " + title + "\n\n"
                + "Objective: Plan, source, and assemble an optimal " + title + " tailored for performance, ergonomics, and aesthetic appeal.\n\n"
                + "Action Items:\n"
                + "1. Research components & peripherals (GPU, CPU, monitor, cable management, ergonomic seating).\n"
                + "2. Calculate total budget, compare pricing across retailers, and check compatibility.\n"
                + "3. Order components and prepare workspace layout with adequate power distribution.\n"
                + "4. Assemble hardware, configure cable routing, install OS drivers, and tune display refresh rates.\n"
                + "5. Conduct stress tests & benchmark thermals to ensure peak system performance.";

        // ── Shopping / Purchases / Sourcing ────────────────────────────────
        } else if (lowerTitle.contains("buy") || lowerTitle.contains("purchase") || lowerTitle.contains("shop")
                || lowerTitle.contains("order") || lowerTitle.contains("vendor")) {
            priority = "MEDIUM";
            estimatedHours = 2;
            description = "Task: " + title + "\n\n"
                + "Objective: Sourcing and procurement for " + title + " with quality verification and price optimization.\n\n"
                + "Action Items:\n"
                + "1. Compile itemized list of required items and specifications for " + title + ".\n"
                + "2. Compare prices, shipping speeds, and return policies across verified sellers.\n"
                + "3. Apply discount codes or bulk offers to optimize expenditure.\n"
                + "4. Place order and track shipment delivery status.\n"
                + "5. Inspect received items upon delivery for quality and retain purchase receipts.";

        // ── Finance / Budget / Tax ──────────────────────────────────────────
        } else if (lowerTitle.contains("finance") || lowerTitle.contains("budget") || lowerTitle.contains("tax")
                || lowerTitle.contains("bill") || lowerTitle.contains("cost") || lowerTitle.contains("invoice")) {
            priority = "HIGH";
            estimatedHours = 3;
            description = "Task: " + title + "\n\n"
                + "Objective: Audit and execute financial operations for " + title + " ensuring compliance and accuracy.\n\n"
                + "Action Items:\n"
                + "1. Gather all relevant invoices, receipts, and financial statements.\n"
                + "2. Reconcile entries against bank ledgers and verify calculations.\n"
                + "3. Categorize expenses and identify cost-saving or tax-deductible opportunities.\n"
                + "4. Prepare summary statement and submit for approval/payment.\n"
                + "5. Archive records securely for compliance auditing.";

        // ── Meeting / Review / Planning ─────────────────────────────────────
        } else if (lowerTitle.contains("meeting") || lowerTitle.contains("review") || lowerTitle.contains("planning")
                || lowerTitle.contains("sprint") || lowerTitle.contains("standup") || lowerTitle.contains("retro")) {
            priority = "MEDIUM";
            estimatedHours = 2;
            description = "Task: " + title + "\n\n"
                + "Objective: Facilitate a productive, outcome-driven meeting for " + title + " with clear agenda and action items.\n\n"
                + "Action Items:\n"
                + "1. Prepare and share meeting agenda for " + title + " 24 hours in advance.\n"
                + "2. Collect input and key discussion points from team members before the session.\n"
                + "3. Facilitate discussion, track decisions, and assign owners for each action item.\n"
                + "4. Send meeting notes and action items recap within 1 hour of conclusion.\n"
                + "5. Follow up on open action items in the next session.";

        // ── Dynamic Fallback (Uses actual task title words!) ──────────────────
        } else {
            priority = "MEDIUM";
            estimatedHours = 3;
            description = "Task: " + title + "\n\n"
                + "Objective: Successfully execute and deliver on '" + title + "' with high quality standards.\n\n"
                + "Action Items:\n"
                + "1. Define scope and key milestones specifically for " + title + ".\n"
                + "2. Sourcing & gathering all required tools, resources, and materials for " + title + ".\n"
                + "3. Step-by-step execution of core requirements for " + title + ".\n"
                + "4. Quality review and testing of deliverables for " + title + ".\n"
                + "5. Finalize setup, document results, and archive project artifacts for " + title + ".";
        }

        return new AiResponse(description, priority, estimatedHours);
    }
}

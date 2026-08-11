package com.taskportal.backend.controllers;

import com.taskportal.backend.dto.JwtResponse;
import com.taskportal.backend.dto.LoginRequest;
import com.taskportal.backend.dto.MessageResponse;
import com.taskportal.backend.dto.RegisterRequest;
import com.taskportal.backend.security.JwtUtils;
import com.taskportal.backend.security.UserDetailsImpl;
import com.taskportal.backend.services.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt, 
                                                 userDetails.getId(), 
                                                 userDetails.getUsername(), 
                                                 roles));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        if (userService.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        userService.registerUser(signUpRequest.getUsername(), signUpRequest.getEmail(), signUpRequest.getPassword());

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Username is required."));
        }

        String otp = userService.generateOtp(username.trim());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "OTP sent successfully to registered account/email.");
        response.put("otp", otp); // Returned in response for interactive simulation & testing
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (username == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: All fields are required."));
        }

        userService.resetPassword(username.trim(), otp.trim(), newPassword);
        return ResponseEntity.ok(new MessageResponse("Password has been reset successfully!"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
        }

        String username = authentication.getName();
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        userService.changePassword(username, currentPassword, newPassword);
        return ResponseEntity.ok(new MessageResponse("Password changed successfully!"));
    }

    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
        }

        String currentUsername = authentication.getName();
        String newUsername = request.get("newUsername");

        if (newUsername == null || newUsername.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: New username is required."));
        }

        userService.updateUsername(currentUsername, newUsername.trim());
        String freshToken = jwtUtils.generateJwtTokenFromUsername(newUsername.trim());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile updated successfully!");
        response.put("token", freshToken);
        response.put("username", newUsername.trim());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> request) {
        String credential = request.get("credential");

        if (credential == null || credential.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Google credential token is required."));
        }

        // Verify the Google ID token via Google's tokeninfo endpoint
        String googleEmail = null;
        String googleName = null;
        try {
            java.net.URL url = new java.net.URL("https://oauth2.googleapis.com/tokeninfo?id_token=" + credential.trim());
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int responseCode = conn.getResponseCode();
            System.out.println("[GoogleAuth] Token verification response code: " + responseCode);

            if (responseCode == 200) {
                java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                String jsonStr = sb.toString();
                System.out.println("[GoogleAuth] Token info response: " + jsonStr);

                // Use Jackson ObjectMapper for reliable JSON parsing
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Object> tokenInfo = mapper.readValue(jsonStr, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});

                googleEmail = (String) tokenInfo.get("email");
                googleName = (String) tokenInfo.get("name");
                if (googleName == null || googleName.isEmpty()) {
                    googleName = (String) tokenInfo.get("given_name");
                }

                System.out.println("[GoogleAuth] Extracted email: " + googleEmail + ", name: " + googleName);
            } else {
                // Read error stream for debugging
                java.io.BufferedReader errReader = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getErrorStream()));
                StringBuilder errSb = new StringBuilder();
                String errLine;
                while ((errLine = errReader.readLine()) != null) errSb.append(errLine);
                errReader.close();
                System.out.println("[GoogleAuth] Token verification FAILED: " + errSb.toString());
                return ResponseEntity.status(401).body(new MessageResponse("Error: Invalid Google ID token."));
            }
        } catch (Exception e) {
            System.out.println("[GoogleAuth] Exception verifying token: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(new MessageResponse("Error: Could not verify Google token: " + e.getMessage()));
        }

        if (googleEmail == null || googleEmail.isEmpty()) {
            return ResponseEntity.status(401).body(new MessageResponse("Error: Could not extract email from Google token."));
        }

        // Derive a safe username from the Google email (e.g. "pavan" from "pavan@gmail.com")
        String googleUsername = googleEmail.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "_");
        if (googleUsername.length() > 30) googleUsername = googleUsername.substring(0, 30);

        System.out.println("[GoogleAuth] Derived username: " + googleUsername);

        // Auto-register if not already existing
        if (!userService.existsByUsername(googleUsername)) {
            System.out.println("[GoogleAuth] Auto-registering new Google user: " + googleUsername);
            userService.registerUser(googleUsername, "GoogleOAuth_" + System.currentTimeMillis());
        }

        String token = jwtUtils.generateJwtTokenFromUsername(googleUsername);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("username", googleUsername);
        response.put("email", googleEmail);
        response.put("name", googleName != null ? googleName : googleUsername);
        response.put("id", 1L);
        response.put("roles", List.of("ROLE_USER"));

        System.out.println("[GoogleAuth] Login successful for: " + googleUsername);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
        }

        String username = authentication.getName();
        userService.deleteAccount(username);
        return ResponseEntity.ok(new MessageResponse("Account deleted successfully!"));
    }

    @PostMapping("/notify-action")
    public ResponseEntity<?> notifyAction(@RequestBody Map<String, String> request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = (authentication != null && authentication.isAuthenticated()) ? authentication.getName() : request.get("username");
        String action = request.get("action");

        if (username != null && action != null) {
            userService.notifyUserAction(username, action);
        }
        return ResponseEntity.ok(new MessageResponse("Notification processed."));
    }
}

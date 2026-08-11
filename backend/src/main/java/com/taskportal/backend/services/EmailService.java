package com.taskportal.backend.services;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@taskportal.com}")
    private String fromEmail;

    public void sendWelcomeOtpEmail(String toEmail, String username, String otpCode) {
        String subject = "Welcome to SyncTask AI Portal - Verification OTP Code";
        String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; rounded: 12px;'>" +
                "<h2 style='color: #2563eb; margin-bottom: 10px;'>Welcome to SyncTask AI Portal!</h2>" +
                "<p>Hello <strong>" + username + "</strong>,</p>" +
                "<p>Thank you for registering with SyncTask AI Portal. Here is your verification OTP code for sign in & account verification:</p>" +
                "<div style='background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e3a8a; margin: 15px 0;'>" +
                otpCode + "</div>" +
                "<p style='font-size: 12px; color: #64748b;'>This OTP code is valid for 10 minutes. If you did not register for an account, please ignore this email.</p>" +
                "<hr style='border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;'/>" +
                "<p style='font-size: 11px; color: #94a3b8; text-align: center;'>SyncTask AI Portal Security Team</p>" +
                "</div>";

        sendHtmlEmailAsync(toEmail, subject, htmlContent);
    }

    public void sendForgotPasswordOtpEmail(String toEmail, String username, String otpCode) {
        String subject = "SyncTask AI Portal - Password Reset OTP Request";
        String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; rounded: 12px;'>" +
                "<h2 style='color: #dc2626; margin-bottom: 10px;'>Password Reset Request</h2>" +
                "<p>Hello <strong>" + username + "</strong>,</p>" +
                "<p>We received a request to reset your SyncTask AI Portal account password. Use the OTP code below to verify your identity:</p>" +
                "<div style='background-color: #fef2f2; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #991b1b; margin: 15px 0;'>" +
                otpCode + "</div>" +
                "<p style='font-size: 12px; color: #64748b;'>This OTP code is valid for 10 minutes. If you did not request a password reset, your account is safe and you can ignore this email.</p>" +
                "<hr style='border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;'/>" +
                "<p style='font-size: 11px; color: #94a3b8; text-align: center;'>SyncTask AI Portal Security Team</p>" +
                "</div>";

        sendHtmlEmailAsync(toEmail, subject, htmlContent);
    }

    public void sendActionNotificationEmail(String toEmail, String username, String actionName) {
        String subject = "SyncTask AI Portal Security Alert: Action [" + actionName + "] Performed";
        String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;'>" +
                "<h2 style='color: #2563eb; margin-bottom: 10px;'>Security & Account Activity Notice</h2>" +
                "<p>Hello <strong>" + username + "</strong>,</p>" +
                "<p>This email is to notify you that the following action was executed on your SyncTask AI Portal account:</p>" +
                "<div style='background-color: #eff6ff; padding: 15px; text-align: center; border-radius: 8px; font-size: 16px; font-weight: bold; color: #1d4ed8; margin: 15px 0; border: 1px solid #bfdbfe;'>" +
                "Action Performed: " + actionName + "</div>" +
                "<p style='font-size: 12px; color: #64748b;'>If you performed this action, no further steps are required. If you did not authorize this change, please contact support or reset your password immediately.</p>" +
                "<hr style='border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;'/>" +
                "<p style='font-size: 11px; color: #94a3b8; text-align: center;'>SyncTask AI Portal Security Team</p>" +
                "</div>";

        sendHtmlEmailAsync(toEmail, subject, htmlContent);
    }

    private void sendHtmlEmailAsync(String toEmail, String subject, String htmlContent) {
        // Dispatch email sending in background thread pool to prevent blocking HTTP requests
        CompletableFuture.runAsync(() -> {
            if (mailSender == null) {
                logger.warn("JavaMailSender is not configured. Simulating email dispatch to: {}", toEmail);
                return;
            }

            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail);
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);

                mailSender.send(message);
                logger.info("Real-time email dispatched successfully to {}", toEmail);
            } catch (Exception e) {
                logger.error("Email dispatch exception to {}: {}", toEmail, e.getMessage());
            }
        });
    }
}

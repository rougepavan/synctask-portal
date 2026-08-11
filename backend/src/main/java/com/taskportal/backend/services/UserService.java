package com.taskportal.backend.services;

import com.taskportal.backend.models.User;
import com.taskportal.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // In-memory OTP storage: username -> OtpInfo
    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();

    private static class OtpData {
        String code;
        LocalDateTime expiresAt;

        OtpData(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }

    @Transactional
    public User registerUser(String username, String password) {
        return registerUser(username, null, password);
    }

    @Transactional
    public User registerUser(String username, String email, String password) {
        if (username == null || username.trim().length() < 2 || username.trim().length() > 50) {
            throw new IllegalArgumentException("Error: Username must be between 2 and 50 characters long.");
        }
        if (password == null || password.length() < 4) {
            throw new IllegalArgumentException("Error: Password must be at least 4 characters long.");
        }

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Error: Username is already taken!");
        }

        User user = new User(username, passwordEncoder.encode(password));
        if (email != null && !email.trim().isEmpty()) {
            user.setEmail(email.trim());
        }
        user.setRole("ROLE_USER");
        User savedUser = userRepository.save(user);

        // Generate Welcome OTP Code and trigger Real-Time Email
        String welcomeOtp = generateWelcomeOtp(username);
        String recipientEmail = (email != null && email.contains("@")) ? email.trim() : (username.contains("@") ? username : username + "@taskportal.com");
        emailService.sendWelcomeOtpEmail(recipientEmail, username, welcomeOtp);

        return savedUser;
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    private String generateWelcomeOtp(String username) {
        SecureRandom random = new SecureRandom();
        int number = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(number);
        otpStore.put(username.toLowerCase(), new OtpData(otpCode, LocalDateTime.now().plusMinutes(10)));
        return otpCode;
    }

    // OTP Generation for Password Reset & Real-Time Email Dispatch
    public String generateOtp(String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("Error: User with username '" + username + "' not found.");
        }

        SecureRandom random = new SecureRandom();
        int number = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(number);

        otpStore.put(username.toLowerCase(), new OtpData(otpCode, LocalDateTime.now().plusMinutes(10)));

        String recipientEmail = username.contains("@") ? username : username + "@taskportal.com";
        emailService.sendForgotPasswordOtpEmail(recipientEmail, username, otpCode);

        return otpCode;
    }

    // Verify OTP
    public boolean verifyOtp(String username, String otpCode) {
        OtpData data = otpStore.get(username.toLowerCase());
        if (data == null) {
            return false;
        }
        if (LocalDateTime.now().isAfter(data.expiresAt)) {
            otpStore.remove(username.toLowerCase());
            return false;
        }
        return data.code.equals(otpCode);
    }

    // Reset password with OTP
    @Transactional
    public void resetPassword(String username, String otpCode, String newPassword) {
        if (!verifyOtp(username, otpCode)) {
            throw new IllegalArgumentException("Error: Invalid or expired OTP verification code.");
        }

        if (newPassword == null || newPassword.length() < 4) {
            throw new IllegalArgumentException("Error: New password must be at least 4 characters long.");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found."));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        otpStore.remove(username.toLowerCase());
    }

    // Change password from Settings
    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found."));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Error: Current password is incorrect.");
        }

        if (newPassword == null || newPassword.length() < 4) {
            throw new IllegalArgumentException("Error: New password must be at least 4 characters long.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Dispatch action notification email
        String email = username.contains("@") ? username : username + "@taskportal.com";
        emailService.sendActionNotificationEmail(email, username, "Password Changed");
    }

    @Transactional
    public User updateUsername(String currentUsername, String newUsername) {
        if (newUsername == null || newUsername.trim().length() < 3 || newUsername.trim().length() > 20 || !newUsername.matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Error: New username must be 3-20 characters long.");
        }
        if (!currentUsername.equalsIgnoreCase(newUsername) && userRepository.existsByUsername(newUsername)) {
            throw new IllegalArgumentException("Error: Username '" + newUsername + "' is already taken!");
        }

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found."));

        user.setUsername(newUsername.trim());
        User updated = userRepository.save(user);

        String email = newUsername.contains("@") ? newUsername : newUsername + "@taskportal.com";
        emailService.sendActionNotificationEmail(email, newUsername, "Username Updated to '" + newUsername + "'");
        return updated;
    }

    @Transactional
    public void deleteAccount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found."));

        String email = username.contains("@") ? username : username + "@taskportal.com";
        emailService.sendActionNotificationEmail(email, username, "Account Permanent Deletion");

        userRepository.delete(user);
    }

    public void notifyUserAction(String username, String actionName) {
        String email = username.contains("@") ? username : username + "@taskportal.com";
        emailService.sendActionNotificationEmail(email, username, actionName);
    }
}

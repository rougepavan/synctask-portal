package com.taskportal.backend.services;

import com.taskportal.backend.models.Task;
import com.taskportal.backend.models.TaskPriority;
import com.taskportal.backend.models.TaskStatus;
import com.taskportal.backend.models.User;
import com.taskportal.backend.repositories.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private BlockchainService blockchainService;

    @InjectMocks
    private TaskService taskService;

    private User testUser;
    private User otherUser;
    private Task testTask;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);

        testUser = new User("alice", "password123");
        testUser.setId(1L);

        otherUser = new User("bob", "password456");
        otherUser.setId(2L);

        testTask = new Task();
        testTask.setId(10L);
        testTask.setTitle("Initial Task");
        testTask.setDescription("Initial Description");
        testTask.setPriority(TaskPriority.MEDIUM);
        testTask.setStatus(TaskStatus.TODO);
        testTask.setUser(testUser);
    }

    @Test
    public void testCreateTask() {
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        Task result = taskService.createTask(testTask, testUser);

        assertNotNull(result);
        assertEquals("Initial Task", result.getTitle());
        verify(taskRepository, times(1)).save(testTask);
        verify(blockchainService, times(1)).recordTransaction(eq(10L), eq("CREATED"), anyString());
    }

    @Test
    public void testGetTaskById_Authorized() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(testTask));

        Task result = taskService.getTaskById(10L, testUser);

        assertNotNull(result);
        assertEquals(10L, result.getId());
    }

    @Test
    public void testGetTaskById_Unauthorized() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(testTask));

        assertThrows(SecurityException.class, () -> {
            taskService.getTaskById(10L, otherUser);
        });
    }

    @Test
    public void testUpdateTask_Authorized() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(testTask));
        when(taskRepository.save(any(Task.class))).thenReturn(testTask);

        Task taskDetails = new Task();
        taskDetails.setTitle("Updated Title");
        taskDetails.setDescription("Updated Description");
        taskDetails.setPriority(TaskPriority.HIGH);
        taskDetails.setStatus(TaskStatus.IN_PROGRESS);

        Task result = taskService.updateTask(10L, taskDetails, testUser);

        assertNotNull(result);
        assertEquals("Updated Title", result.getTitle());
        assertEquals(TaskPriority.HIGH, result.getPriority());
        assertEquals(TaskStatus.IN_PROGRESS, result.getStatus());
        verify(taskRepository, times(1)).save(any(Task.class));
        verify(blockchainService, times(1)).recordTransaction(eq(10L), eq("UPDATED"), anyString());
    }

    @Test
    public void testDeleteTask_Authorized() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(testTask));

        taskService.deleteTask(10L, testUser);

        verify(taskRepository, times(1)).delete(testTask);
        verify(blockchainService, times(1)).recordTransaction(eq(10L), eq("DELETED"), anyString());
    }
}

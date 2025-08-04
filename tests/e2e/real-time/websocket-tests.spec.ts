import { test, expect, Page } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, TIMEOUTS } from '../../utils/test-constants';

test.describe('Real-time WebSocket Features', () => {
  let clientPage: Page;
  let adminPage: Page;
  let clientToken: string;
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    // Create two browser contexts for real-time testing
    const clientContext = await browser.newContext();
    const adminContext = await browser.newContext();
    
    clientPage = await clientContext.newPage();
    adminPage = await adminContext.newPage();

    // Login both users
    const { token: cToken } = await EnhancedTestHelpers.loginUser(clientPage, 'client');
    clientToken = cToken;
    
    const { token: aToken } = await EnhancedTestHelpers.loginUser(adminPage, 'admin');
    adminToken = aToken;
  });

  test.afterAll(async () => {
    await clientPage.close();
    await adminPage.close();
  });

  test.describe('Real-time Messaging', () => {
    test('Message delivery between users', async () => {
      // Navigate both users to messaging
      await clientPage.goto('/portal.html');
      await clientPage.click('text=Messages');
      
      await adminPage.goto('/admin.html');
      await adminPage.click('text=Messages');

      // Wait for WebSocket connection
      await clientPage.waitForTimeout(1000);
      await adminPage.waitForTimeout(1000);

      // Admin sends message to client
      const testMessage = `Test message ${Date.now()}`;
      
      // Select client conversation
      await adminPage.click(`text="${TEST_USERS.client.firstName} ${TEST_USERS.client.lastName}"`);
      
      // Type and send message
      await adminPage.fill('textarea[name="message"], input[name="message"]', testMessage);
      await adminPage.press('textarea[name="message"], input[name="message"]', 'Enter');

      // Client should receive message in real-time
      await expect(clientPage.locator(`text="${testMessage}"`)).toBeVisible({ 
        timeout: TIMEOUTS.short 
      });
      
      console.log('✅ Real-time message delivered');

      // Test message status updates
      const messageElement = adminPage.locator(`text="${testMessage}"`).locator('..');
      
      // Check for sent indicator
      await expect(messageElement.locator('.sent-indicator, [data-status="sent"]')).toBeVisible();
      
      // Check for delivered indicator
      await expect(messageElement.locator('.delivered-indicator, [data-status="delivered"]')).toBeVisible({ 
        timeout: TIMEOUTS.short 
      });
      
      console.log('✅ Message status updated in real-time');
    });

    test('Typing indicators', async () => {
      // Navigate to messages
      await clientPage.goto('/portal.html');
      await clientPage.click('text=Messages');
      
      await adminPage.goto('/admin.html');
      await adminPage.click('text=Messages');
      
      // Select conversation
      await adminPage.click(`text="${TEST_USERS.client.firstName}"`);
      await clientPage.click(`text="${TEST_USERS.admin.firstName}"`);

      // Admin starts typing
      await adminPage.fill('textarea[name="message"]', 'Testing typing...');

      // Client should see typing indicator
      await expect(clientPage.locator('text=/typing|is typing/i')).toBeVisible({ 
        timeout: TIMEOUTS.short 
      });
      
      console.log('✅ Typing indicator shown');

      // Stop typing
      await adminPage.fill('textarea[name="message"]', '');

      // Typing indicator should disappear
      await expect(clientPage.locator('text=/typing|is typing/i')).not.toBeVisible({ 
        timeout: TIMEOUTS.short 
      });
      
      console.log('✅ Typing indicator hidden');
    });

    test('Message read receipts', async () => {
      // Send a message from admin
      const testMessage = `Read receipt test ${Date.now()}`;
      
      await adminPage.fill('textarea[name="message"]', testMessage);
      await adminPage.press('textarea[name="message"]', 'Enter');

      // Wait for message to appear
      const adminMessage = adminPage.locator(`text="${testMessage}"`).locator('..');
      await expect(adminMessage).toBeVisible();

      // Client opens conversation
      await clientPage.click(`text="${TEST_USERS.admin.firstName}"`);

      // Message should be marked as read
      await expect(adminMessage.locator('.read-indicator, [data-status="read"]')).toBeVisible({ 
        timeout: TIMEOUTS.medium 
      });
      
      console.log('✅ Read receipt updated');

      // Check unread count updates
      const unreadBadge = clientPage.locator('.unread-badge, [data-unread-count]');
      if (await unreadBadge.isVisible()) {
        const count = await unreadBadge.textContent();
        console.log(`  Unread count: ${count}`);
      }
    });

    test('Message reactions', async () => {
      // Send a message
      const testMessage = `React to this message ${Date.now()}`;
      
      await adminPage.fill('textarea[name="message"]', testMessage);
      await adminPage.press('textarea[name="message"]', 'Enter');

      // Wait for message
      await clientPage.waitForSelector(`text="${testMessage}"`);
      
      // Client adds reaction
      const messageElement = clientPage.locator(`text="${testMessage}"`).locator('..');
      await messageElement.hover();
      
      // Click reaction button
      const reactionBtn = messageElement.locator('button[aria-label*="react"], .reaction-button');
      if (await reactionBtn.isVisible()) {
        await reactionBtn.click();
        
        // Select emoji
        await clientPage.click('text="👍"');
        
        // Reaction should appear on both sides
        await expect(messageElement.locator('text="👍"')).toBeVisible();
        await expect(adminPage.locator(`text="${testMessage}"`).locator('..').locator('text="👍"')).toBeVisible({ 
          timeout: TIMEOUTS.short 
        });
        
        console.log('✅ Message reaction synced');
      }
    });

    test('File sharing in chat', async () => {
      // Navigate to messages
      await clientPage.goto('/portal.html');
      await clientPage.click('text=Messages');

      // Select conversation
      await clientPage.click(`text="${TEST_USERS.admin.firstName}"`);

      // Look for file attachment button
      const attachBtn = clientPage.locator('button[aria-label*="attach"], .attach-button');
      
      if (await attachBtn.isVisible()) {
        await attachBtn.click();

        // Select file
        const fileInput = clientPage.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: 'chat-attachment.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Test file for chat')
        });

        // File should appear in chat
        await expect(clientPage.locator('text="chat-attachment.pdf"')).toBeVisible();
        
        // Admin should see file
        await expect(adminPage.locator('text="chat-attachment.pdf"')).toBeVisible({ 
          timeout: TIMEOUTS.medium 
        });
        
        console.log('✅ File shared in real-time chat');
      }
    });
  });

  test.describe('Real-time Notifications', () => {
    test('Push notifications for new messages', async () => {
      // Check if notifications are supported
      const notificationPermission = await clientPage.evaluate(() => {
        return Notification.permission;
      });

      if (notificationPermission === 'granted') {
        // Monitor for notifications
        let notificationReceived = false;
        
        await clientPage.evaluateOnNewDocument(() => {
          const originalNotification = window.Notification;
          window.Notification = class extends originalNotification {
            constructor(title: string, options?: NotificationOptions) {
              super(title, options);
              (window as any).lastNotification = { title, body: options?.body };
            }
          };
        });

        // Send message to trigger notification
        const notificationMessage = `Notification test ${Date.now()}`;
        await adminPage.fill('textarea[name="message"]', notificationMessage);
        await adminPage.press('textarea[name="message"]', 'Enter');

        // Check if notification was created
        await clientPage.waitForTimeout(1000);
        const notification = await clientPage.evaluate(() => (window as any).lastNotification);
        
        if (notification) {
          console.log(`✅ Push notification: ${notification.title}`);
          notificationReceived = true;
        }
      } else {
        console.log('⚠️  Notifications not granted, skipping test');
      }
    });

    test('Real-time activity feed', async () => {
      // Navigate to dashboard
      await adminPage.goto('/admin.html');
      
      // Look for activity feed
      const activityFeed = adminPage.locator('.activity-feed, [data-activity-feed]');
      
      if (await activityFeed.isVisible()) {
        // Count initial activities
        const initialCount = await activityFeed.locator('.activity-item').count();
        
        // Trigger an activity (client uploads file)
        await clientPage.goto('/portal.html');
        const fileInput = clientPage.locator('input[type="file"]').first();
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles({
            name: 'activity-test.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('Activity test')
          });
          
          // Check if activity appears in admin feed
          await adminPage.waitForTimeout(2000);
          const newCount = await activityFeed.locator('.activity-item').count();
          
          expect(newCount).toBeGreaterThan(initialCount);
          console.log('✅ Real-time activity feed updated');
        }
      }
    });

    test('Phase change notifications', async () => {
      // Admin changes project phase
      await adminPage.goto('/admin.html');
      await adminPage.click('text=Projects');
      
      // Find a project
      const projectRow = adminPage.locator('tr[data-project-id]').first();
      
      if (await projectRow.isVisible()) {
        // Change phase
        const phaseSelect = projectRow.locator('select[name="phase"]');
        if (await phaseSelect.isVisible()) {
          const currentPhase = await phaseSelect.inputValue();
          await phaseSelect.selectOption({ index: 2 }); // Select different phase
          
          // Client should receive notification
          await clientPage.goto('/portal.html');
          
          // Check for notification banner or toast
          const notification = clientPage.locator('.notification, .toast, [role="alert"]');
          await expect(notification.filter({ hasText: /phase|updated|changed/i })).toBeVisible({ 
            timeout: TIMEOUTS.medium 
          });
          
          console.log('✅ Phase change notification received');
        }
      }
    });
  });

  test.describe('Online/Offline Status', () => {
    test('User presence indicators', async () => {
      // Both users navigate to messages
      await clientPage.goto('/portal.html');
      await clientPage.click('text=Messages');
      
      await adminPage.goto('/admin.html');
      await adminPage.click('text=Messages');

      // Check online status indicators
      const clientStatus = adminPage.locator(`[data-user="${TEST_USERS.client.email}"] .status-indicator`);
      const adminStatus = clientPage.locator(`[data-user="${TEST_USERS.admin.email}"] .status-indicator`);

      // Both should show online
      await expect(clientStatus).toHaveClass(/online|active/);
      await expect(adminStatus).toHaveClass(/online|active/);
      
      console.log('✅ Online presence indicators working');

      // Test offline simulation
      await clientPage.evaluate(() => {
        // Simulate going offline
        window.dispatchEvent(new Event('offline'));
      });

      // Admin should see client as offline
      await expect(clientStatus).toHaveClass(/offline|away/, { timeout: TIMEOUTS.medium });
      console.log('✅ Offline status updated');

      // Restore online
      await clientPage.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      await expect(clientStatus).toHaveClass(/online|active/, { timeout: TIMEOUTS.medium });
    });

    test('Last seen timestamps', async () => {
      // Check for last seen info
      const userList = adminPage.locator('.user-list, [data-users]');
      
      if (await userList.isVisible()) {
        const lastSeenElements = userList.locator('.last-seen, [data-last-seen]');
        const count = await lastSeenElements.count();
        
        if (count > 0) {
          const firstLastSeen = await lastSeenElements.first().textContent();
          console.log(`✅ Last seen tracking: ${firstLastSeen}`);
        }
      }
    });
  });

  test.describe('Real-time Collaboration', () => {
    test('Concurrent editing detection', async () => {
      // Both users navigate to same project
      await clientPage.goto('/portal.html');
      const projectLink = clientPage.locator('a[href*="project"]').first();
      
      if (await projectLink.isVisible()) {
        const projectUrl = await projectLink.getAttribute('href');
        
        // Both open same project
        await clientPage.click(projectLink);
        await adminPage.goto(projectUrl!);

        // Admin starts editing
        const editBtn = adminPage.locator('button:has-text("Edit")').first();
        if (await editBtn.isVisible()) {
          await editBtn.click();

          // Client should see editing indicator
          await expect(clientPage.locator('text=/editing|being edited/i')).toBeVisible({ 
            timeout: TIMEOUTS.short 
          });
          
          console.log('✅ Concurrent editing warning shown');
        }
      }
    });

    test('Live cursor tracking', async () => {
      // Navigate to collaborative document
      const collaborativeDoc = clientPage.locator('a:has-text("Brief"), a:has-text("Document")').first();
      
      if (await collaborativeDoc.isVisible()) {
        await collaborativeDoc.click();
        
        const docUrl = clientPage.url();
        await adminPage.goto(docUrl);

        // Move cursor in document
        const editor = adminPage.locator('.editor, [contenteditable="true"]').first();
        if (await editor.isVisible()) {
          await editor.click({ position: { x: 100, y: 50 } });

          // Client should see admin's cursor
          const remoteCursor = clientPage.locator('.remote-cursor, [data-user-cursor]');
          await expect(remoteCursor).toBeVisible({ timeout: TIMEOUTS.short });
          
          console.log('✅ Live cursor tracking active');
        }
      }
    });
  });

  test.describe('WebSocket Connection Management', () => {
    test('Automatic reconnection on disconnect', async () => {
      // Monitor WebSocket status
      const wsStatus = await clientPage.evaluate(() => {
        const ws = (window as any).websocket || (window as any).io;
        return ws ? 'connected' : 'not found';
      });

      console.log(`WebSocket status: ${wsStatus}`);

      // Simulate disconnect
      await clientPage.evaluate(() => {
        const ws = (window as any).websocket || (window as any).io;
        if (ws && ws.disconnect) {
          ws.disconnect();
        }
      });

      // Wait for reconnection
      await clientPage.waitForTimeout(3000);

      // Check if reconnected
      const reconnected = await clientPage.evaluate(() => {
        const ws = (window as any).websocket || (window as any).io;
        return ws && ws.connected;
      });

      expect(reconnected).toBeTruthy();
      console.log('✅ WebSocket auto-reconnection working');
    });

    test('Message queue during offline', async () => {
      // Go offline
      await clientPage.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Try to send message while offline
      const offlineMessage = `Offline message ${Date.now()}`;
      await clientPage.fill('textarea[name="message"]', offlineMessage);
      await clientPage.press('textarea[name="message"]', 'Enter');

      // Message should be queued
      const queuedIndicator = clientPage.locator('.queued, [data-status="queued"]');
      await expect(queuedIndicator).toBeVisible();

      // Go back online
      await clientPage.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Message should be sent
      await expect(adminPage.locator(`text="${offlineMessage}"`)).toBeVisible({ 
        timeout: TIMEOUTS.medium 
      });
      
      console.log('✅ Offline message queue working');
    });
  });

  test.describe('Performance & Scalability', () => {
    test('Message delivery latency', async () => {
      const iterations = 5;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const timestamp = Date.now();
        const testMessage = `Latency test ${timestamp}`;

        // Send message
        await adminPage.fill('textarea[name="message"]', testMessage);
        await adminPage.press('textarea[name="message"]', 'Enter');

        // Measure time to receive
        const startTime = Date.now();
        await clientPage.waitForSelector(`text="${testMessage}"`, { 
          timeout: TIMEOUTS.short 
        });
        const endTime = Date.now();

        const latency = endTime - startTime;
        latencies.push(latency);
        
        await clientPage.waitForTimeout(1000); // Delay between tests
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      console.log(`✅ Average message latency: ${avgLatency}ms`);
      console.log(`  Min: ${Math.min(...latencies)}ms, Max: ${Math.max(...latencies)}ms`);

      // Should be under 500ms average
      expect(avgLatency).toBeLessThan(500);
    });

    test('Handling rapid message bursts', async () => {
      const messageCount = 20;
      const messages: string[] = [];

      // Send burst of messages
      for (let i = 0; i < messageCount; i++) {
        const msg = `Burst message ${i}`;
        messages.push(msg);
        
        await adminPage.fill('textarea[name="message"]', msg);
        await adminPage.press('textarea[name="message"]', 'Enter');
      }

      // All messages should arrive
      for (const msg of messages) {
        await expect(clientPage.locator(`text="${msg}"`)).toBeVisible({ 
          timeout: TIMEOUTS.medium 
        });
      }

      console.log(`✅ All ${messageCount} messages delivered in burst`);
    });
  });
});
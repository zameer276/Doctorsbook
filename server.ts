import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// We'll try to load from a service account if it exists, otherwise use default
const configPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(express.json());

  app.post('/api/admin/create-doctor', async (req, res) => {
    const { email, password, name, specialization, availability } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterEmail = decodedToken.email;

      if (requesterEmail !== 'ratherzameer30@gmail.com') {
        return res.status(403).json({ error: 'Forbidden: Admin access only' });
      }

      // Create the user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      // Create the user profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name,
        email,
        role: 'doctor',
        createdAt: new Date().toISOString(),
      });

      // Create the doctor details in Firestore
      await db.collection('doctors').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name,
        email,
        specialization,
        availability,
        createdBy: decodedToken.uid,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error('Error creating doctor:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/update-doctor', async (req, res) => {
    const { uid, email, password, name, specialization, availability } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterEmail = decodedToken.email;

      if (requesterEmail !== 'ratherzameer30@gmail.com') {
        return res.status(403).json({ error: 'Forbidden: Admin access only' });
      }

      // Update Auth user
      const updateData: any = {
        displayName: name,
        email: email,
      };
      if (password) {
        updateData.password = password;
      }
      await admin.auth().updateUser(uid, updateData);

      // Update Firestore user profile
      await db.collection('users').doc(uid).update({
        name,
        email,
      });

      // Update Firestore doctor details
      await db.collection('doctors').doc(uid).update({
        name,
        email,
        specialization,
        availability,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating doctor:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/delete-user', async (req, res) => {
    const { uid } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      // Verify the requester is an admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requesterEmail = decodedToken.email;

      if (requesterEmail !== 'ratherzameer30@gmail.com') {
        return res.status(403).json({ error: 'Forbidden: Admin access only' });
      }

      // Delete from Auth
      await admin.auth().deleteUser(uid);

      // Delete from Firestore
      await db.collection('users').doc(uid).delete();
      await db.collection('doctors').doc(uid).delete();
      
      // Optionally delete appointments related to this user
      // (Simplified for now)

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reminder Cron Job - Runs every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running reminder check...');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Format date as YYYY-MM-DD
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    try {
      const appointmentsRef = db.collection('appointments');
      const snapshot = await appointmentsRef
        .where('date', '==', tomorrowStr)
        .where('status', '==', 'approved')
        .get();

      if (snapshot.empty) {
        console.log('No appointments found for tomorrow.');
        return;
      }

      for (const doc of snapshot.docs) {
        const appointment = doc.data();
        const appointmentId = doc.id;

        // Check if reminder already sent
        const remindersRef = db.collection('notifications');
        const existingReminders = await remindersRef
          .where('appointmentId', '==', appointmentId)
          .where('type', '==', 'reminder')
          .get();

        if (existingReminders.empty) {
          // Send to Patient
          await remindersRef.add({
            userId: appointment.patientId,
            title: 'Appointment Reminder',
            message: `Reminder: You have an appointment with Dr. ${appointment.doctorName} tomorrow at ${appointment.time}.`,
            type: 'reminder',
            read: false,
            createdAt: new Date().toISOString(),
            appointmentId: appointmentId
          });

          // Send to Doctor
          await remindersRef.add({
            userId: appointment.doctorId,
            title: 'Appointment Reminder',
            message: `Reminder: You have an appointment with ${appointment.patientName} tomorrow at ${appointment.time}.`,
            type: 'reminder',
            read: false,
            createdAt: new Date().toISOString(),
            appointmentId: appointmentId
          });

          console.log(`Sent reminders for appointment ${appointmentId}`);
        }
      }
    } catch (error) {
      console.error('Error in reminder cron job:', error);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

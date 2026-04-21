import express from "express";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const app = express();

app.use(express.json());

app.post("/api/google/classroom/courses", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const classroom = google.classroom({ version: "v1", auth });
    
    const studentResponse = await classroom.courses.list({ courseStates: ["ACTIVE"], studentId: 'me' });
    const studentCourses = (studentResponse.data.courses || []).map(c => ({ ...c, role: 'student' }));
    
    const teacherResponse = await classroom.courses.list({ courseStates: ["ACTIVE"], teacherId: 'me' });
    const teacherCourses = (teacherResponse.data.courses || []).map(c => ({ ...c, role: 'teacher' }));

    const allCourses = [...studentCourses, ...teacherCourses];
    const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values());

    res.json(uniqueCourses);
  } catch (error: any) {
    console.error("Classroom API Error (Courses):", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to fetch courses";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/classroom/coursework", async (req, res) => {
  const { accessToken, courseId } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });
  
  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.courseWork.list({ courseId });
    res.json(response.data.courseWork || []);
  } catch (error: any) {
    console.error(`Classroom API Error (Coursework) for course ${courseId}:`, error);
    const message = error.response?.data?.error?.message || error.message || "Failed to fetch coursework";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/classroom/announcements", async (req, res) => {
  const { accessToken, courseId } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });
  
  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const classroom = google.classroom({ version: "v1", auth });
    const response = await classroom.courses.announcements.list({ courseId });
    res.json(response.data.announcements || []);
  } catch (error: any) {
    console.error(`Classroom API Error (Announcements) for course ${courseId}:`, error);
    const message = error.response?.data?.error?.message || error.message || "Failed to fetch announcements";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/classroom/submissions", async (req, res) => {
  const { accessToken, courseId, courseWorkId, role } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const classroom = google.classroom({ version: "v1", auth });
    
    const response = await classroom.courses.courseWork.studentSubmissions.list({ 
      courseId, 
      courseWorkId,
      userId: role === 'teacher' ? '-' : 'me'
    });
    res.json(response.data.studentSubmissions || []);
  } catch (error: any) {
    console.error("Classroom API Error (Submissions):", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to fetch submissions";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/tasks/list", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const tasksApi = google.tasks({ version: "v1", auth });
    const taskLists = await tasksApi.tasklists.list();
    const defaultList = taskLists.data.items?.[0]?.id;
    
    if (!defaultList) return res.json([]);

    const response = await tasksApi.tasks.list({ tasklist: defaultList });
    res.json(response.data.items || []);
  } catch (error: any) {
    console.error("Google Tasks API Error (List):", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to fetch Google Tasks";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/tasks/sync", async (req, res) => {
  const { accessToken, task } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const tasksApi = google.tasks({ version: "v1", auth });
    
    const taskLists = await tasksApi.tasklists.list();
    const tasklist = taskLists.data.items?.[0]?.id;
    if (!tasklist) throw new Error("No tasklist found");

    if (task.externalId) {
      await tasksApi.tasks.update({
        tasklist,
        task: task.externalId,
        requestBody: {
          id: task.externalId,
          title: task.title,
          notes: task.description,
          status: task.completed ? 'completed' : 'needsAction',
          due: task.dueDate
        }
      });
      res.json({ status: 'updated' });
    } else {
      const response = await tasksApi.tasks.insert({
        tasklist,
        requestBody: {
          title: task.title,
          notes: task.description,
          status: task.completed ? 'completed' : 'needsAction',
          due: task.dueDate
        }
      });
      res.json({ status: 'created', externalId: response.data.id });
    }
  } catch (error: any) {
    console.error("Google Tasks API Error (Sync):", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to sync task";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/calendar/sync", async (req, res) => {
  const { accessToken, task } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No token provided" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth });
    
    const event = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.dueDate,
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(new Date(task.dueDate).getTime() + 3600000).toISOString(),
        timeZone: 'UTC',
      },
      colorId: task.completed ? '10' : (task.priority === 'high' ? '11' : '1'),
    };

    if (task.calendarEventId) {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: task.calendarEventId,
        requestBody: event,
      });
      res.json({ status: 'updated' });
    } else {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      res.json({ status: 'created', calendarEventId: response.data.id });
    }
  } catch (error: any) {
    console.error("Google Calendar API Error:", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to sync with Google Calendar";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/calendar/delete", async (req, res) => {
  const { accessToken, eventId } = req.body;
  if (!accessToken || !eventId) return res.status(400).json({ error: "Missing parameters" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    res.json({ status: 'deleted' });
  } catch (error: any) {
    console.error("Google Calendar Delete Error:", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to delete calendar event";
    res.status(500).json({ error: message });
  }
});

app.post("/api/google/tasks/delete", async (req, res) => {
  const { accessToken, externalId } = req.body;
  if (!accessToken || !externalId) return res.status(400).json({ error: "Missing parameters" });

  try {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const tasksApi = google.tasks({ version: "v1", auth });
    
    const taskLists = await tasksApi.tasklists.list();
    const tasklist = taskLists.data.items?.[0]?.id;
    if (!tasklist) throw new Error("No tasklist found");

    await tasksApi.tasks.delete({
      tasklist,
      task: externalId,
    });
    res.json({ status: 'deleted' });
  } catch (error: any) {
    console.error("Google Tasks Delete Error:", error);
    const message = error.response?.data?.error?.message || error.message || "Failed to delete Google Task";
    res.status(500).json({ error: message });
  }
});

export default app;

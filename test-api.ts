import { google } from "googleapis";
const classroom = google.classroom({version: 'v1'});
console.log("courses:", Object.keys(classroom.courses));
console.log("courseWork:", Object.keys(classroom.courses.courseWork));
console.log("announcements:", Object.keys(classroom.courses.announcements));
console.log("studentSubmissions:", Object.keys(classroom.courses.courseWork.studentSubmissions));



process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

require('dotenv').config();
const axios = require('axios');
const Table = require('cli-table3');
const chalk = require('chalk');

const jiraBaseUrl = process.env.JIRA_BASE_URL;
const email = process.env.JIRA_EMAIL;
const apiToken = process.env.JIRA_API_TOKEN;
const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

const axiosInstance = axios.create({
  baseURL: jiraBaseUrl,
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json'
  }
});

async function getAllData() {
  try {
    const projectsResponse = await axiosInstance.get('/rest/api/3/project/search');
    const projects = projectsResponse.data.values;

    const table = new Table({
  head: [
    chalk.cyan.bold('Project Name'),
    chalk.blue.bold('Key'),
    chalk.greenBright.bold('Tickets'),
    chalk.cyan.bold('Sprints'),
    chalk.cyan.bold('Velocity')
  ],
  colWidths: [30, 10, 10, 10, 10],
});


    for (const project of projects) {
      const projectKey = project.key;
      const projectName = project.name;

      let ticketCount = 0;
      let sprintCount = 0;
      let velocityPoints = 0;

      try {
        const ticketsRes = await axiosInstance.get(`/rest/api/3/search?jql=project=${projectKey}`);
        ticketCount = ticketsRes.data.total;
      } catch { }

      let boardId = null;
      try {
        const boardsRes = await axiosInstance.get(`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
        const boards = boardsRes.data.values;
        if (boards.length > 0) boardId = boards[0].id;
      } catch { }

      if (boardId) {
        try {
          const sprintsRes = await axiosInstance.get(`/rest/agile/1.0/board/${boardId}/sprint`);
          sprintCount = sprintsRes.data.values.length;
        } catch { }

        try {
          const velocityRes = await axiosInstance.get(`/rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${boardId}`);
          const velocityData = velocityRes.data.velocityStatEntries;
          for (let sprintId in velocityData) {
            const sprint = velocityData[sprintId];
            velocityPoints += sprint.estimated.value;
          }
        } catch { }
      }

      table.push([projectName, projectKey, ticketCount, sprintCount, velocityPoints]);
    }

    console.log("\n📊 Jira Project Dashboard:");
    console.log(table.toString());

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

getAllData();

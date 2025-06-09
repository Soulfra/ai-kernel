#!/usr/bin/env node
// Gamification CLI: Voting, peer review, badges
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CLUSTERS_FILE = process.env.CLUSTERS_FILE || './clusters/clusters.json';
const LOG_FILE = process.env.LOG_FILE || './logs/gamification-cli.log';

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
}

function loadClusters() {
  if (!fs.existsSync(CLUSTERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
}

function saveClusters(clusters) {
  fs.writeFileSync(CLUSTERS_FILE, JSON.stringify(clusters, null, 2));
}

function voteCluster(clusters, key, concept, up) {
  const cluster = clusters[key];
  if (!cluster) return false;
  for (const item of cluster) {
    if (item.concept === concept) {
      item.votes = (item.votes || 0) + (up ? 1 : -1);
      log(`${up ? 'Upvoted' : 'Downvoted'}: ${concept} in cluster ${key}`);
      return true;
    }
  }
  return false;
}

function showLeaderboard(clusters) {
  const tally = [];
  Object.entries(clusters).forEach(([key, items]) => {
    items.forEach(item => {
      tally.push({ concept: item.concept, votes: item.votes || 0 });
    });
  });
  tally.sort((a, b) => b.votes - a.votes);
  console.log('Leaderboard:');
  tally.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. ${item.concept} (${item.votes} votes)`);
  });
}

function main() {
  const clusters = loadClusters();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('Gamification CLI: [vote] [leaderboard] [exit]');
  rl.on('line', line => {
    const [cmd, ...args] = line.trim().split(' ');
    if (cmd === 'vote') {
      const [key, concept, dir] = args;
      if (voteCluster(clusters, key, concept, dir !== 'down')) {
        saveClusters(clusters);
        console.log('Vote recorded.');
      } else {
        console.log('Cluster or concept not found.');
      }
    } else if (cmd === 'leaderboard') {
      showLeaderboard(clusters);
    } else if (cmd === 'exit') {
      rl.close();
    } else {
      console.log('Commands: vote <key> <concept> [up|down], leaderboard, exit');
    }
  });
  rl.on('close', () => process.exit(0));
}

if (require.main === module) main();
// TODO: Add peer review, badges, analytics integration, and error handling 
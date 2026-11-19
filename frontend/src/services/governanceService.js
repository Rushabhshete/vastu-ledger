import apiClient from "./apiClient.js";

export async function listPolls() {
  const { data } = await apiClient.get("/governance/polls");
  return data.data;
}

export async function getPoll(pollId) {
  const { data } = await apiClient.get(`/governance/polls/${pollId}`);
  return data.data;
}

export async function createPoll(pollData) {
  const { data } = await apiClient.post("/governance/polls", pollData);
  return data.data;
}

export async function castVote(pollId, choice) {
  const { data } = await apiClient.post(`/governance/polls/${pollId}/vote`, { choice });
  return data.data;
}

export async function getAgmPackage() {
  const { data } = await apiClient.get("/governance/agm-package");
  return data.data;
}

import apiClient from "./apiClient.js";

export async function listTickets(params = {}) {
  const { data } = await apiClient.get("/helpdesk", { params });
  return data.data;
}

export async function getTicketDetails(ticketId) {
  const { data } = await apiClient.get(`/helpdesk/${ticketId}`);
  return data.data;
}

export async function createTicket(ticketData, photoFile = null) {
  let payload = ticketData;
  let headers = {};

  if (photoFile) {
    const formData = new FormData();
    Object.entries(ticketData).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        formData.append(key, val);
      }
    });
    formData.append("photo", photoFile);
    payload = formData;
    headers = { "Content-Type": "multipart/form-data" };
  }

  const { data } = await apiClient.post("/helpdesk", payload, { headers });
  return data.data;
}

export async function updateTicketProgress(ticketId, fields) {
  const { data } = await apiClient.put(`/helpdesk/${ticketId}`, fields);
  return data.data;
}

export async function closeAndRateTicket(ticketId, { rating, feedback }) {
  const { data } = await apiClient.post(`/helpdesk/${ticketId}/close`, { rating, feedback });
  return data.data;
}

export async function addComment(ticketId, { comment, isInternal = false }) {
  const { data } = await apiClient.post(`/helpdesk/${ticketId}/comments`, { comment, isInternal });
  return data.data;
}

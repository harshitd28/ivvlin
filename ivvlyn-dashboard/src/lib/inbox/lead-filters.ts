/** True when the customer messaged after the last agent reply (or agent never replied). */
export function leadNeedsReply(l: {
  last_customer_message_at: string | null;
  last_agent_response_at: string | null;
}): boolean {
  const cust = l.last_customer_message_at;
  if (!cust) return false;
  const agent = l.last_agent_response_at;
  if (!agent) return true;
  return new Date(cust).getTime() > new Date(agent).getTime();
}

export function isLatestConversationResolved(latestConversationStatus: string | null | undefined): boolean {
  return (latestConversationStatus ?? "").toLowerCase() === "resolved";
}

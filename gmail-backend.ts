import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK inside this module as well
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-gmail',
      },
    },
  });
}

/**
 * Extracts and cleans the latest email reply from the thread body.
 */
function extractCleanEmailBody(text: string): string {
  if (!text) return "";
  const lines = text.split('\n');
  const cleanLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    
    // Stop at common thread separators
    if (
      line.startsWith('-----Original Message-----') ||
      line.startsWith('From:') ||
      line.startsWith('On ') && line.includes('wrote:') ||
      line.startsWith('On ') && line.includes('wrote :') ||
      line.startsWith('On ') && line.includes('gmail.com') ||
      line.startsWith('---') ||
      line.includes('wrote:') && line.startsWith('>') ||
      line.startsWith('>')
    ) {
      break;
    }

    cleanLines.push(line);
  }

  let result = cleanLines.join('\n').trim();
  if (!result && text) {
    result = text.slice(0, 1000);
  }
  return result;
}

/**
 * Retrieves the latest reply for a single ticket ID from the civxindia@gmail.com inbox.
 * Maintained for backward compatibility.
 */
export async function fetchGmailRepliesFromInbox(caseShort: string): Promise<{ text: string; date: string } | null> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log("[Gmail Service] GMAIL_APP_PASSWORD is not set. Skipping real Gmail fetch.");
    return null;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'civxindia@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD
    },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = (client.mailbox as any)?.exists || 0;
      if (total > 0) {
        const start = Math.max(1, total - 29);
        const range = `${start}:${total}`;
        
        const fetchedMessages = [];
        for await (const msg of client.fetch(range, { source: true })) {
          fetchedMessages.push(msg);
        }
        
        fetchedMessages.reverse();

        for (const msg of fetchedMessages) {
          if (msg.source) {
            const parsed = await simpleParser(msg.source);
            const fromAddress = (parsed.from?.value?.[0]?.address || "").toLowerCase();
            const subject = (parsed.subject || "").toLowerCase();
            const textBody = (parsed.text || parsed.html || "").toLowerCase();
            
            const casePattern = new RegExp(`sc[-_\\s]?${caseShort}`, 'i');
            const matchesCase = casePattern.test(subject) || casePattern.test(textBody);
            
            if (matchesCase && fromAddress !== 'civxindia@gmail.com') {
              const dateStr = parsed.date ? parsed.date.toLocaleTimeString() : new Date().toLocaleTimeString();
              const rawBody = parsed.text || parsed.html || "";
              const cleanBody = extractCleanEmailBody(rawBody);
              
              return {
                text: cleanBody,
                date: dateStr
              };
            }
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error("[Gmail Service] Error checking Gmail via IMAP:", err);
  }
  return null;
}

/**
 * Fetches the latest 50 emails from the civxindia@gmail.com inbox and categorizes them
 * based on the referenced complaint ticket, status classification, and department.
 */
export async function fetchAndCategorizeAllReplies(complaintsList: any[]): Promise<any> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    return {
      success: false,
      message: "GMAIL_APP_PASSWORD environment variable is missing on server.",
      categories: getEmptyCategorization()
    };
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'civxindia@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD
    },
    logger: false
  });

  const parsedEmails: any[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = (client.mailbox as any)?.exists || 0;
      console.log(`[Gmail Service] Connected. Total emails found: ${total}`);
      if (total > 0) {
        // Fetch up to 40 emails for dashboard categorization feed
        const start = Math.max(1, total - 39);
        const range = `${start}:${total}`;
        const fetchedMessages = [];
        for await (const msg of client.fetch(range, { source: true })) {
          fetchedMessages.push(msg);
        }
        
        fetchedMessages.reverse(); // Newest first

        for (const msg of fetchedMessages) {
          if (msg.source) {
            try {
              const parsed = await simpleParser(msg.source);
              const fromAddress = (parsed.from?.value?.[0]?.address || "").toLowerCase();
              
              // Skip outgoing messages sent by the system itself
              if (fromAddress === 'civxindia@gmail.com') {
                continue;
              }

              const subject = parsed.subject || "(No Subject)";
              const rawBody = parsed.text || parsed.html || "";
              const cleanBody = extractCleanEmailBody(rawBody);
              const dateStr = parsed.date ? parsed.date.toLocaleString() : new Date().toLocaleString();
              const fromName = parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address || "Unknown Sender";

              // Try to find a Ticket ID in the subject or body (e.g., SC-B8F2A3)
              const caseMatch = subject.match(/sc[-_\\s]?([a-f0-9]{6})/i) || cleanBody.match(/sc[-_\\s]?([a-f0-9]{6})/i);
              let associatedCaseId = null;
              let complaintTitle = null;
              let mappedDepartment = "Unmapped";
              let matchingComplaint = null;

              if (caseMatch) {
                const matchedHex = caseMatch[1].toLowerCase();
                matchingComplaint = complaintsList.find(c => c.caseId.toLowerCase().endsWith(matchedHex) || c.id.toLowerCase().includes(matchedHex));
                if (matchingComplaint) {
                  associatedCaseId = matchingComplaint.caseId;
                  complaintTitle = matchingComplaint.title;
                  mappedDepartment = matchingComplaint.department;
                } else {
                  associatedCaseId = `SC-${matchedHex.toUpperCase()}`;
                }
              }

              parsedEmails.push({
                id: parsed.messageId || Math.random().toString(36).substring(2),
                sender: fromName,
                senderEmail: fromAddress,
                subject,
                date: dateStr,
                body: cleanBody,
                associatedCaseId,
                complaintTitle,
                department: mappedDepartment,
                matchingComplaint
              });
            } catch (err) {
              console.error("[Gmail Service] Error parsing single email structure:", err);
            }
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error("[Gmail Service] ImapFlow error:", err);
    return {
      success: false,
      message: `Failed to fetch emails: ${(err as Error).message}`,
      categories: getEmptyCategorization()
    };
  }

  // Now, categorize each parsed email!
  const categories = getEmptyCategorization();

  console.log(`Found ${parsedEmails.length} new matching emails.`);

  for (const email of parsedEmails) {
    const textToLower = (email.subject + " " + email.body).toLowerCase();
    
    // Default fallback heuristics for categorization
    let categoryKey: keyof typeof categories = "general";
    let statusClass = "neutral";
    let sentiment = "Neutral";
    let statusSummary = "Awaiting review";

    if (textToLower.includes("reject") || textToLower.includes("out of scope") || textToLower.includes("private property")) {
      categoryKey = "rejected";
      statusClass = "rejected";
      sentiment = "Dismissive";
      statusSummary = "Complaint Rejected";
    } else if (textToLower.includes("permission") || textToLower.includes("license") || textToLower.includes("standby") || textToLower.includes("traffic clearance")) {
      categoryKey = "permissionPending";
      statusClass = "pending";
      sentiment = "Cooperative";
      statusSummary = "Awaiting Permit Approval";
    } else if (textToLower.includes("complete") || textToLower.includes("resolved") || textToLower.includes("invoice") || textToLower.includes("bill") || textToLower.includes("repaired")) {
      categoryKey = "completed";
      statusClass = "completed";
      sentiment = "Cooperative";
      statusSummary = "Repairs Finished / Invoice Shared";
    } else if (textToLower.includes("ongoing") || textToLower.includes("work order") || textToLower.includes("in progress") || textToLower.includes("scheduled")) {
      categoryKey = "workOngoing";
      statusClass = "ongoing";
      sentiment = "Cooperative";
      statusSummary = "Repairs In-Progress";
    }

    if (!email.associatedCaseId) {
      categoryKey = "unmatched";
    }

    // Attempt Gemini refinement for each email if AI is active
    let aiRefined = null;
    if (ai) {
      try {
        const prompt = `Analyze this municipal department email reply and categorize it.
        Subject: "${email.subject}"
        Sender: "${email.sender} <${email.senderEmail}>"
        Body: "${email.body.substring(0, 800)}"

        Return a strict JSON format (no markdown blocks):
        {
          "category": "workOngoing" | "permissionPending" | "completed" | "rejected" | "general" | "unmatched",
          "sentiment": "Cooperative" | "Defensive" | "Dismissive" | "Neutral",
          "statusSummary": "Concise 4-8 word state tag, e.g., 'Repairs in Progress' or 'Awaiting Road License'",
          "actionItems": ["next step 1", "next step 2"],
          "repairedImageDetected": boolean
        }`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const rawText = response.text || '';
        const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const resJson = JSON.parse(cleanText);
        if (resJson.category) {
          categoryKey = resJson.category;
          sentiment = resJson.sentiment || sentiment;
          statusSummary = resJson.statusSummary || statusSummary;
          aiRefined = {
            actionItems: resJson.actionItems || [],
            repairedImageDetected: resJson.repairedImageDetected || false
          };
        }
      } catch (gemErr) {
        // Fall back gracefully to robust heuristics
        console.log("[Gmail Service] Handled single email refinement with robust offline heuristic backup.");
        const lowerBody = email.body.toLowerCase();
        let fallbackCategory: "completed" | "workOngoing" | "permissionPending" | "rejected" | "general" | "unmatched" = "general";
        let fallbackSentiment = "Neutral";
        let fallbackStatusSummary = "Email registered & matched";
        let fallbackActionItems = ["Awaiting physical assessment by ward engineer."];

        if (lowerBody.includes("permit") || lowerBody.includes("license") || lowerBody.includes("traffic clearance") || lowerBody.includes("standby")) {
          fallbackCategory = "permissionPending";
          fallbackStatusSummary = "Awaiting Road License";
          fallbackActionItems = ["Obtain Traffic Police road excavation permit."];
        } else if (lowerBody.includes("complete") || lowerBody.includes("resolve") || lowerBody.includes("repaired") || lowerBody.includes("done")) {
          fallbackCategory = "completed";
          fallbackStatusSummary = "Repairs Completed";
          fallbackActionItems = ["Verify patch repair and request citizen sign-off."];
        } else if (lowerBody.includes("ongoing") || lowerBody.includes("work order") || lowerBody.includes("in progress")) {
          fallbackCategory = "workOngoing";
          fallbackStatusSummary = "Repairs In-Progress";
          fallbackActionItems = ["Mobilize field repair crew to site location."];
        } else if (lowerBody.includes("reject") || lowerBody.includes("cancel") || lowerBody.includes("private layout")) {
          fallbackCategory = "rejected";
          fallbackSentiment = "Dismissive";
          fallbackStatusSummary = "Complaint Rejected";
          fallbackActionItems = ["Coordinate appeal with local resident welfare association."];
        }

        categoryKey = fallbackCategory;
        sentiment = fallbackSentiment;
        statusSummary = fallbackStatusSummary;
        aiRefined = {
          actionItems: fallbackActionItems,
          repairedImageDetected: false
        };
      }
    } else {
      // Offline heuristic fallback when AI client is not initialized
      const lowerBody = email.body.toLowerCase();
      let fallbackCategory: "completed" | "workOngoing" | "permissionPending" | "rejected" | "general" | "unmatched" = "general";
      let fallbackSentiment = "Neutral";
      let fallbackStatusSummary = "Email registered & matched";
      let fallbackActionItems = ["Awaiting physical assessment by ward engineer."];

      if (lowerBody.includes("permit") || lowerBody.includes("license") || lowerBody.includes("traffic clearance") || lowerBody.includes("standby")) {
        fallbackCategory = "permissionPending";
        fallbackStatusSummary = "Awaiting Road License";
        fallbackActionItems = ["Obtain Traffic Police road excavation permit."];
      } else if (lowerBody.includes("complete") || lowerBody.includes("resolve") || lowerBody.includes("repaired") || lowerBody.includes("done")) {
        fallbackCategory = "completed";
        fallbackStatusSummary = "Repairs Completed";
        fallbackActionItems = ["Verify patch repair and request citizen sign-off."];
      } else if (lowerBody.includes("ongoing") || lowerBody.includes("work order") || lowerBody.includes("in progress")) {
        fallbackCategory = "workOngoing";
        fallbackStatusSummary = "Repairs In-Progress";
        fallbackActionItems = ["Mobilize field repair crew to site location."];
      } else if (lowerBody.includes("reject") || lowerBody.includes("cancel") || lowerBody.includes("private layout")) {
        fallbackCategory = "rejected";
        fallbackSentiment = "Dismissive";
        fallbackStatusSummary = "Complaint Rejected";
        fallbackActionItems = ["Coordinate appeal with local resident welfare association."];
      }

      categoryKey = fallbackCategory;
      sentiment = fallbackSentiment;
      statusSummary = fallbackStatusSummary;
      aiRefined = {
        actionItems: fallbackActionItems,
        repairedImageDetected: false
      };
    }

    const item = {
      id: email.id,
      sender: email.sender,
      senderEmail: email.senderEmail,
      subject: email.subject,
      date: email.date,
      body: email.body,
      associatedCaseId: email.associatedCaseId,
      complaintTitle: email.complaintTitle,
      department: email.department,
      statusClass,
      sentiment,
      statusSummary,
      aiRefined
    };

    categories[categoryKey].push(item);

    // AI-driven decision & urgency detection
    const isHighUrgency = 
      email.subject.toLowerCase().includes('urgent') || 
      email.body.toLowerCase().includes('urgent') || 
      email.body.toLowerCase().includes('standby') || 
      email.body.toLowerCase().includes('reject') || 
      email.body.toLowerCase().includes('completed') ||
      sentiment === 'Dismissive';

    const ai_decision = {
      urgency: isHighUrgency ? "HIGH" : "MEDIUM",
      summary: statusSummary,
      sentiment: sentiment,
      actionItems: aiRefined?.actionItems || [],
      ticketId: email.associatedCaseId || "Unmatched"
    };

    console.log(`\nProcessing: ${email.subject}`);
    console.log(JSON.stringify(ai_decision, null, 2));

    if (ai_decision.urgency === "HIGH") {
      console.log(`🚨 ALERT: Taking immediate action for: ${ai_decision.summary}`);
    }
  }

  return {
    success: true,
    totalFetched: parsedEmails.length,
    categories
  };
}

function getEmptyCategorization() {
  return {
    workOngoing: [] as any[],         // Work ongoing / approved
    permissionPending: [] as any[],   // Standby / awaiting permission license
    completed: [] as any[],           // Completed (Awaiting Audit / Invoiced)
    rejected: [] as any[],            // Rejected / private layouts
    general: [] as any[],             // General replies / acknowledgments
    unmatched: [] as any[]            // Unmatched to active system cases
  };
}

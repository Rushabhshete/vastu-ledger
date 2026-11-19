import pool from "../config/db.js";

/**
 * List all AGM polls for a society with live democratic vote tallies,
 * statutory quorum metrics, and the calling flat's ballot status.
 */
export async function listPolls(societyId = null, userFlatId = null) {
  const socId = Number(societyId) || 1;

  // 1. Get total flats for quorum calculation
  const [flatCountRows] = await pool.execute(
    "SELECT COUNT(*) as total FROM flats WHERE society_id = ?",
    [socId]
  );
  const totalFlats = flatCountRows[0]?.total || 10;

  // 2. Fetch all polls for society
  const [polls] = await pool.execute(
    "SELECT * FROM agm_polls WHERE society_id = ? ORDER BY start_date DESC",
    [socId]
  );

  if (polls.length === 0) return [];

  // 3. Fetch all votes for these polls
  const pollIds = polls.map((p) => p.id);
  const [votes] = await pool.query(
    `SELECT pv.*, u.full_name, f.wing, f.number AS flat_number
     FROM poll_votes pv
     JOIN users u ON pv.user_id = u.id
     JOIN flats f ON pv.flat_id = f.id
     WHERE pv.poll_id IN (?)
     ORDER BY pv.voted_at ASC`,
    [pollIds]
  );

  // Group votes by poll_id
  const votesByPoll = {};
  for (const v of votes) {
    if (!votesByPoll[v.poll_id]) votesByPoll[v.poll_id] = [];
    votesByPoll[v.poll_id].push(v);
  }

  const now = new Date();

  return polls.map((p) => {
    let options = p.options;
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch {
        options = ["YES", "NO", "ABSTAIN"];
      }
    } else if (!Array.isArray(options)) {
      options = ["YES", "NO", "ABSTAIN"];
    }

    const pollVotes = votesByPoll[p.id] || [];
    const totalVotes = pollVotes.length;

    // Tally breakdown by choice
    const tally = {};
    const percentages = {};
    for (const opt of options) {
      tally[opt] = 0;
      percentages[opt] = 0;
    }

    for (const v of pollVotes) {
      if (tally[v.choice] !== undefined) {
        tally[v.choice] += 1;
      } else {
        tally[v.choice] = 1;
      }
    }

    for (const opt of options) {
      percentages[opt] =
        totalVotes > 0 ? Number(((tally[opt] / totalVotes) * 100).toFixed(1)) : 0;
    }

    // Statutory Quorum metrics (Default: 60% of units for binding resolution)
    const quorumPct = 60;
    const quorumRequired = Math.ceil(totalFlats * (quorumPct / 100));
    const quorumMet = totalVotes >= quorumRequired;
    const turnoutPct =
      totalFlats > 0 ? Number(((totalVotes / totalFlats) * 100).toFixed(1)) : 0;

    // Lifecycle status
    const startDate = new Date(p.start_date);
    const endDate = new Date(p.end_date);
    let status = "ACTIVE";

    if (now < startDate) {
      status = "UPCOMING";
    } else if (now > endDate || !p.is_active) {
      status = "CLOSED";
    }

    // Outcome determination
    let outcome = "IN_PROGRESS";
    if (status === "CLOSED") {
      if (!quorumMet) {
        outcome = "INCONCLUSIVE_NO_QUORUM";
      } else {
        const yesCount = tally["YES"] || 0;
        const noCount = tally["NO"] || 0;
        if (yesCount > noCount) {
          outcome = "PASSED";
        } else {
          outcome = "REJECTED";
        }
      }
    }

    // Calling flat's voting state
    const userVoteObj = userFlatId
      ? pollVotes.find((v) => v.flat_id === Number(userFlatId))
      : null;

    return {
      ...p,
      options,
      totalFlats,
      totalVotes,
      tally,
      percentages,
      quorumPct,
      quorumRequired,
      quorumMet,
      turnoutPct,
      status,
      outcome,
      hasVoted: Boolean(userVoteObj),
      userVote: userVoteObj ? userVoteObj.choice : null,
      userVotedAt: userVoteObj ? userVoteObj.voted_at : null,
      votes: pollVotes,
    };
  });
}

export async function findPollById(id, societyId = null, userFlatId = null) {
  const [rows] = await pool.execute("SELECT * FROM agm_polls WHERE id = ?", [id]);
  const poll = rows[0] || null;
  if (!poll) return null;

  const socId = societyId || poll.society_id || 1;
  const list = await listPolls(socId, userFlatId);
  return list.find((p) => p.id === Number(id)) || poll;
}

export async function createPoll(poll) {
  const socId = poll.societyId || 1;
  const [result] = await pool.execute(
    `INSERT INTO agm_polls (society_id, title, description, options, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      socId,
      poll.title,
      poll.description,
      JSON.stringify(poll.options),
      poll.startDate,
      poll.endDate,
      poll.createdBy,
    ]
  );
  return result.insertId;
}

export async function castVote(pollId, userId, flatId, choice) {
  const [result] = await pool.execute(
    "INSERT INTO poll_votes (poll_id, user_id, flat_id, choice) VALUES (?, ?, ?, ?)",
    [pollId, userId, flatId, choice]
  );
  return result.insertId;
}

export async function getVotesByPoll(pollId) {
  const [rows] = await pool.execute(
    `SELECT pv.*, u.full_name, f.wing, f.number AS flat_number
     FROM poll_votes pv
     JOIN users u ON pv.user_id = u.id
     JOIN flats f ON pv.flat_id = f.id
     WHERE pv.poll_id = ?`,
    [pollId]
  );
  return rows;
}

export async function hasVoted(pollId, flatId) {
  const [rows] = await pool.execute(
    "SELECT id FROM poll_votes WHERE poll_id = ? AND flat_id = ?",
    [pollId, flatId]
  );
  return rows.length > 0;
}

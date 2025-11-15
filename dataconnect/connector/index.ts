// dataconnect/connector/index.ts
//
// This file contains the TypeScript logic for the 'eugene' connector.
// It defines resolvers that map GraphQL operations from your schema
// to queries against your PostgreSQL database.

import { connector } from "@google-cloud/dataconnect-sdk";

// --- Note Resolvers ---

export const listNotes = connector.query("listNotes", {
  postgres: {
    table: "notes",
    columns: {
      id: "id",
      content: "content",
      createdAt: "created_at",
      imageUrl: "image_url",
    },
  },
});

export const createNote = connector.mutation("createNote", {
  args: {
    content: connector.arg.string({ required: true }),
    imageUrl: connector.arg.string(),
  },
  postgres: (args) => ({
    operation: "insert",
    table: "notes",
    values: {
      content: args.content,
      image_url: args.imageUrl,
    },
    returning: {
      id: "id",
      content: "content",
      createdAt: "created_at",
      imageUrl: "image_url",
    },
  }),
});

export const updateNote = connector.mutation("updateNote", {
  args: {
    id: connector.arg.string({ required: true }),
    content: connector.arg.string({ required: true }),
  },
  postgres: (args) => ({
    operation: "update",
    table: "notes",
    where: { id: { _eq: args.id } },
    updates: {
      content: args.content,
    },
    returning: {
      id: "id",
    },
  }),
});

export const deleteNote = connector.mutation("deleteNote", {
  args: {
    id: connector.arg.string({ required: true }),
  },
  postgres: (args) => ({
    operation: "delete",
    table: "notes",
    where: { id: { _eq: args.id } },
    returning: {
      id: "id",
    },
  }),
});

// --- HACCP Log Resolvers ---

export const listHaccpLogs = connector.query("listHaccpLogs", {
  args: {
    startDate: connector.arg.string(),
    endDate: connector.arg.string(),
  },
  postgres: (args) => ({
    table: "haccp_logs",
    where: {
      ...(args.startDate && { date: { _gte: args.startDate } }),
      ...(args.endDate && { date: { _lte: args.endDate } }),
    },
    columns: {
      id: "id",
      type: "type",
      label: "label",
      date: "date",
      time: "time",
      temperature: "temperature",
      checkedBy: "checked_by",
      correctiveAction: "corrective_action",
    },
  }),
});

export const createHaccpLog = connector.mutation("createHaccpLog", {
  args: {
    type: connector.arg.string({ required: true }),
    label: connector.arg.string({ required: true }),
    date: connector.arg.string({ required: true }),
    time: connector.arg.string({ required: true }),
    temperature: connector.arg.string({ required: true }),
    checkedBy: connector.arg.string(),
    correctiveAction: connector.arg.string(),
  },
  postgres: (args) => ({
    operation: "insert",
    table: "haccp_logs",
    values: {
      type: args.type,
      label: args.label,
      date: args.date,
      time: args.time,
      temperature: args.temperature,
      checked_by: args.checkedBy,
      corrective_action: args.correctiveAction,
    },
    returning: {
      id: "id",
      type: "type",
      label: "label",
      date: "date",
      time: "time",
      temperature: "temperature",
      checkedBy: "checked_by",
      correctiveAction: "corrective_action",
    },
  }),
});

export const updateHaccpLog = connector.mutation("updateHaccpLog", {
  args: {
    id: connector.arg.string({ required: true }),
    label: connector.arg.string(),
    time: connector.arg.string(),
    temperature: connector.arg.string(),
    checkedBy: connector.arg.string(),
    correctiveAction: connector.arg.string(),
  },
  postgres: (args) => ({
    operation: "update",
    table: "haccp_logs",
    where: { id: { _eq: args.id } },
    updates: {
      label: args.label,
      time: args.time,
      temperature: args.temperature,
      checked_by: args.checkedBy,
      corrective_action: args.correctiveAction,
    },
    returning: {
      id: "id",
    },
  }),
});

export const deleteHaccpLog = connector.mutation("deleteHaccpLog", {
  args: {
    id: connector.arg.string({ required: true }),
  },
  postgres: (args) => ({
    operation: "delete",
    table: "haccp_logs",
    where: { id: { _eq: args.id } },
    returning: {
      id: "id",
    },
  }),
});

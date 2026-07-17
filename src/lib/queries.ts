import { db } from "@/lib/db";
import { projects, analyses, responses, syncLogs } from "@/db/schema";
import { eq, desc, sql, and, or, ilike, gte, lte, isNotNull } from "drizzle-orm";
import { CONTACT_REGEX } from "@/lib/contacts-regex";

export interface ProjectFilters {
  status?: string;
  search?: string;
  verdict?: string;
  platform?: string;
  minBudget?: string;
  maxBudget?: string;
  hasContact?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProjectRow {
  id: number;
  kworkId: number;
  platform: string;
  platformId: string;
  categoryId: number;
  name: string;
  priceLimit: string | null;
  maxDays: number | null;
  status: string;
  userName: string | null;
  timeLeft: string | null;
  skipReason: string | null;
  url: string | null;
  createdAt: Date | null;
  hasContact: boolean;
  analysis: {
    verdict: string | null;
    score: number | null;
    responseCost: string | null;
    responseText: string | null;
  } | null;
}

export interface ProjectListResult {
  items: ProjectRow[];
  total: number;
  limit: number;
  offset: number;
}

function buildConditions(f: ProjectFilters) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (f.status && f.status !== "all" && f.status !== "recommended") {
    conditions.push(eq(projects.status, f.status));
  }
  if (f.platform && f.platform !== "all") {
    conditions.push(eq(projects.platform, f.platform));
  }
  if (f.search) {
    conditions.push(
      or(
        ilike(projects.name, `%${f.search}%`),
        ilike(projects.description, `%${f.search}%`),
      )! as ReturnType<typeof eq>,
    );
  }
  if (f.minBudget) {
    conditions.push(
      gte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(f.minBudget)) as ReturnType<typeof eq>,
    );
  }
  if (f.maxBudget) {
    conditions.push(
      lte(sql`CAST(NULLIF(${projects.priceLimit}, '') AS NUMERIC)`, parseFloat(f.maxBudget)) as ReturnType<typeof eq>,
    );
  }
  if (f.hasContact) {
    conditions.push(sql`${projects.description} ~* ${CONTACT_REGEX}` as ReturnType<typeof eq>);
  }

  return conditions;
}

export async function getProjects(f: ProjectFilters): Promise<ProjectListResult> {
  const limit = Math.min(f.limit ?? 50, 100);
  const offset = f.offset ?? 0;

  const latestAnalysis = db
    .selectDistinctOn([analyses.projectId], {
      projectId: analyses.projectId,
      verdict: analyses.verdict,
      score: analyses.score,
      responseCost: analyses.responseCost,
      responseText: analyses.responseText,
    })
    .from(analyses)
    .where(f.verdict && f.verdict !== "all" ? eq(analyses.verdict, f.verdict) : undefined)
    .orderBy(desc(analyses.projectId), desc(analyses.id))
    .as("latest_analysis");

  const conditions = buildConditions(f);

  if (f.verdict && f.verdict !== "all") {
    conditions.push(sql`${latestAnalysis.projectId} IS NOT NULL` as ReturnType<typeof eq>);
  }
  if (f.status === "recommended") {
    conditions.push(sql`${latestAnalysis.score} >= 8` as ReturnType<typeof eq>);
    conditions.push(sql`${latestAnalysis.projectId} IS NOT NULL` as ReturnType<typeof eq>);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: projects.id,
        kworkId: projects.kworkId,
        platform: projects.platform,
        platformId: projects.platformId,
        categoryId: projects.categoryId,
        name: projects.name,
        priceLimit: projects.priceLimit,
        maxDays: projects.maxDays,
        status: projects.status,
        userName: projects.userName,
        timeLeft: projects.timeLeft,
        skipReason: projects.skipReason,
        url: projects.url,
        createdAt: projects.createdAt,
        hasContact: sql<boolean>`CASE WHEN ${projects.description} ~* ${CONTACT_REGEX} THEN true ELSE false END`,
        analysis: {
          verdict: latestAnalysis.verdict,
          score: latestAnalysis.score,
          responseCost: latestAnalysis.responseCost,
          responseText: latestAnalysis.responseText,
        },
      })
      .from(projects)
      .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${projects.id})` })
      .from(projects)
      .leftJoin(latestAnalysis, eq(latestAnalysis.projectId, projects.id))
      .where(where),
  ]);

  return {
    items,
    total: Number(totalResult[0]?.count || 0),
    limit,
    offset,
  };
}

export interface DashboardStats {
  stats: {
    total: number;
    new: number;
    analyzed: number;
    worth: number;
    responded: number;
    withContacts: number;
  };
  conversion: {
    submitted: number;
    viewed: number;
    responded: number;
    rejected: number;
    conversionRate: number;
  };
  logs: {
    id: number;
    type: string;
    status: string;
    projectsFound: number | null;
    projectsNew: number | null;
    projectsAnalyzed: number | null;
    createdAt: Date;
  }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalRows] = await db.select({ value: sql<number>`count(*)` }).from(projects);
  const [newRows] = await db.select({ value: sql<number>`count(*)` }).from(projects).where(eq(projects.status, "new"));
  const [analyzedRows] = await db.select({ value: sql<number>`count(*)` }).from(projects).where(eq(projects.status, "analyzed"));
  const [worthRows] = await db.select({ value: sql<number>`count(*)` }).from(analyses).where(eq(analyses.verdict, "worth"));
  const [respondedRows] = await db.select({ value: sql<number>`count(*)` }).from(responses);
  const [contactRows] = await db
    .select({ value: sql<number>`count(*)` })
    .from(projects)
    .where(sql`${projects.description} ~* ${CONTACT_REGEX}`);

  const [submittedRows] = await db.select({ value: sql<number>`count(*)` }).from(responses).where(eq(responses.sent, true));
  const [viewedRows] = await db.select({ value: sql<number>`count(*)` }).from(responses).where(isNotNull(responses.viewedAt));
  const [conversionRows] = await db.select({ value: sql<number>`count(*)` }).from(responses).where(isNotNull(responses.respondedAt));
  const [rejectedRows] = await db.select({ value: sql<number>`count(*)` }).from(responses).where(isNotNull(responses.rejectedAt));

  const submittedCount = Number(submittedRows.value);
  const conversionCount = Number(conversionRows.value);
  const conversionRate = submittedCount > 0 ? Math.round((conversionCount / submittedCount) * 100) : 0;

  const logData = await db
    .select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.createdAt))
    .limit(20);

  return {
    stats: {
      total: Number(totalRows.value),
      new: Number(newRows.value),
      analyzed: Number(analyzedRows.value),
      worth: Number(worthRows.value),
      responded: Number(respondedRows.value),
      withContacts: Number(contactRows.value),
    },
    conversion: {
      submitted: submittedCount,
      viewed: Number(viewedRows.value),
      responded: conversionCount,
      rejected: Number(rejectedRows.value),
      conversionRate,
    },
    logs: logData,
  };
}

export interface ResponseRow {
  id: number;
  projectId: number;
  content: string;
  status: string;
  kworkOfferId: string | null;
  sent: boolean;
  sentAt: Date | null;
  viewedAt: Date | null;
  respondedAt: Date | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date | null;
  projectName: string;
  kworkId: number;
  url: string | null;
  platform: string;
}

export async function getResponses(status?: string): Promise<ResponseRow[]> {
  const whereClause = status ? eq(responses.status, status) : undefined;
  return db
    .select({
      id: responses.id,
      projectId: responses.projectId,
      content: responses.content,
      status: responses.status,
      kworkOfferId: responses.kworkOfferId,
      sent: responses.sent,
      sentAt: responses.sentAt,
      viewedAt: responses.viewedAt,
      respondedAt: responses.respondedAt,
      rejectedAt: responses.rejectedAt,
      rejectReason: responses.rejectReason,
      createdAt: responses.createdAt,
      projectName: projects.name,
      kworkId: projects.kworkId,
      url: projects.url,
      platform: projects.platform,
    })
    .from(responses)
    .innerJoin(projects, eq(responses.projectId, projects.id))
    .where(whereClause)
    .orderBy(desc(responses.createdAt));
}

export async function getResponseForProject(projectId: number): Promise<{
  projectId: number;
  kworkId: number;
  projectName: string;
  responseText: string | null;
  responseCost: string | null;
  responseTimeline: string | null;
  verdict: string | null;
  score: number | null;
  url: string | null;
  platform: string;
} | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;

  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.projectId, project.id))
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  if (!analysis?.responseText) return null;

  return {
    projectId: project.id,
    kworkId: project.kworkId,
    projectName: project.name,
    responseText: analysis.responseText,
    responseCost: analysis.responseCost,
    responseTimeline: analysis.responseTimeline,
    verdict: analysis.verdict,
    score: analysis.score,
    url: project.url,
    platform: project.platform,
  };
}

export async function getProjectDetail(projectId: number): Promise<{
  project: typeof projects.$inferSelect;
  analyses: typeof analyses.$inferSelect[];
  responses: typeof responses.$inferSelect[];
} | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;

  const [analysisList, responseList] = await Promise.all([
    db.select().from(analyses).where(eq(analyses.projectId, projectId)),
    db.select().from(responses).where(eq(responses.projectId, projectId)),
  ]);

  return { project, analyses: analysisList, responses: responseList };
}

const API_BASE = "https://api.kwork.ru";

function getBasicAuth() {
  const username = process.env.KWORK_BASIC_USER;
  const password = process.env.KWORK_BASIC_PASS;
  if (!username || !password) {
    throw new Error("KWORK_BASIC_USER/KWORK_BASIC_PASS not set in env");
  }
  return { username, password };
}

let cachedToken: string = "";
let tokenExpires: number = 0;

async function getToken(): Promise<string> {
  if (cachedToken && tokenExpires > Date.now() + 86400000) {
    return cachedToken;
  }

  const login = process.env.KWORK_LOGIN;
  const password = process.env.KWORK_PASSWORD;

  if (!login || !password) {
    throw new Error("KWORK_LOGIN/KWORK_PASSWORD not set in env");
  }

  const basic = getBasicAuth();
  const credentials = Buffer.from(
    `${basic.username}:${basic.password}`
  ).toString("base64");

  const res = await fetch(`${API_BASE}/signIn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ login, password }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Kwork auth failed: ${data.error || JSON.stringify(data)}`);
  }

  cachedToken = data.response.token;
  tokenExpires = Date.now() + (data.response.expired || 2592000) * 1000;
  return cachedToken;
}

async function kworkPost(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = await getToken();
  const basic = getBasicAuth();
  const credentials = Buffer.from(
    `${basic.username}:${basic.password}`
  ).toString("base64");

  const res = await fetch(`${API_BASE}/${endpoint}?token=${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams(params),
  });

  const data = await res.json();
  if (!data.success && data.error) {
    throw new Error(`Kwork API error: ${data.error}`);
  }
  return data.response ?? data;
}

export interface KworkActor {
  id: number;
  username: string;
  fullname: string;
  rating: number;
  good_reviews: number;
  bad_reviews: number;
  free_amount: number;
  hold_amount: number;
  completed_orders_count: number;
  kworks_count: number;
  offers_count: number;
  worker_status: string;
}

export interface KworkConnects {
  all_connects: number;
  active_connects: number;
}

export async function getActor(): Promise<KworkActor> {
  return kworkPost("actor") as Promise<KworkActor>;
}

export async function getConnects(): Promise<KworkConnects> {
  const data = (await kworkPost("projects", {})) as Record<string, unknown>;
  return (data.connects as KworkConnects) || { all_connects: 0, active_connects: 0 };
}

export async function getProjects(category = "", page = 1): Promise<unknown[]> {
  const params: Record<string, string> = {};
  if (category) params.c = category;
  if (page > 1) params.page = String(page);
  const data = (await kworkPost("projects", params)) as Record<string, unknown>;
  return (data.wants || data.projects || []) as unknown[];
}

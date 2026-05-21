const fetch = globalThis.fetch;

async function main() {
  const now = Date.now();
  const email = `testuser_${now}@example.com`;
  const password = "Password123!";

  console.log("Testing backend API endpoints...");

  const registerRes = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ FullName: "Test User", Email: email, Password: password }),
  });
  const registerJson = await registerRes.json();
  console.log("REGISTER", registerRes.status, registerJson);

  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  console.log("LOGIN", loginRes.status, loginJson);

  let token = loginJson.token;
  if (!token) {
    console.error("Login failed, cannot continue auth tests.");
    process.exit(1);
  }

  const meRes = await fetch("http://localhost:5000/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meJson = await meRes.json();
  console.log("ME", meRes.status, meJson);

  const eventsRes = await fetch("http://localhost:5000/api/events");
  const eventsJson = await eventsRes.json();
  console.log("EVENTS", eventsRes.status, eventsJson);

  const healthRes = await fetch("http://localhost:5000/health");
  const healthJson = await healthRes.json();
  console.log("HEALTH", healthRes.status, healthJson);
}

main().catch((error) => {
  console.error("ERROR", error);
  process.exit(1);
});
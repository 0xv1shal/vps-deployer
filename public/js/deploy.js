document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("deploy-btn");

  if (!btn) return;

  btn.addEventListener("click", async () => {
    const projId = btn.dataset.projid;

    btn.disabled = true;
    btn.innerText = "Deploying...";

    try {
      const res = await fetch("/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed");
        btn.disabled = false;
        btn.innerText = "🚀 Deploy Now";
        return;
      }

      window.location.href = `/deployment/${data.deployId}`;
    } catch {
      btn.disabled = false;
      btn.innerText = "🚀 Deploy Now";
    }
  });
});
const deployId = document.getElementById("deploy-id").dataset.id;

function badge(status) {
  if (status === "success") return "badge bg-success";
  if (status === "failed") return "badge bg-danger";
  return "badge bg-warning text-dark";
}

async function fetchUpdates() {
  try {
    const res = await fetch(`/deploy/${deployId}`);
    const data = await res.json();

    // update status
    const statusEl = document.getElementById("deploy-status");
    statusEl.innerHTML = `<span class="${badge(data.deployment.status)}">${data.deployment.status}</span>`;

    // update finished time
    document.getElementById("finished-at").innerText =
      data.deployment.finished_at || "Running...";

    // update logs
    const logsContainer = document.getElementById("logs");
    logsContainer.innerHTML = "";

    data.logs.forEach(log => {
      const div = document.createElement("div");
      div.className = "card mb-3";

      div.innerHTML = `
        <div class="card-header">
          <strong>${log.cmd}</strong>
          <span class="float-end ${badge(log.status)}">${log.status}</span>
        </div>
        <div class="card-body">
          <small class="text-muted">
            Started: ${log.started_at}<br/>
            Finished: ${log.finished_at || "Running..."}
          </small>
          <pre class="bg-dark text-success p-2 mt-2" style="max-height:300px; overflow:auto;">${log.log || ""}</pre>
        </div>
      `;

      logsContainer.appendChild(div);
    });

    if (data.deployment.status !== "running") {
      clearInterval(interval);
    }

  } catch (err) {
    console.error(err);
  }
}

const interval = setInterval(fetchUpdates, 3000);
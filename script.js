const UI = {
  // UI elements
  totalCount: document.getElementById("totalCount"),
  pendingCount: document.getElementById("pendingCount"),
  doneCount: document.getElementById("doneCount"),
  btnSeed: document.getElementById("seedBtn"),
  btnClear: document.getElementById("clearBtn"),
  btnAll: document.getElementById("btnAll"),
  btnPending: document.getElementById("btnPending"),
  btnDone: document.getElementById("btnDone"),

  searchInput: document.getElementById("searchInput"),
  titleInput: document.getElementById("title"),
  descriptionInput: document.getElementById("description"),

  btnReset: document.getElementById("resetBtn"),
  btnSubmit: document.getElementById("submitBtn"),

  shownCount: document.getElementById("shownCount"),

  taskForm: document.getElementById("taskForm"),
  taskList: document.getElementById("taskList"),
  shownCount: document.getElementById("shownCount"),
};

let db;
const request = indexedDB.open("TaskManagerDB", 2);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  const store = db.createObjectStore("tasks", {
    keyPath: "Id",
    autoIncrement: true,
  });

  store.createIndex("titleIndex", "title", { unique: false });
  store.createIndex("descriptionIndex", "description", { unique: false });

  console.log("Database setup complete");
};

request.onsuccess = (event) => {
  db = event.target.result;
};

request.onerror = (event) => {
  console.error(
    "Error occurred while opening the database:",
    event.target.error,
  );
};

UI.btnSeed.addEventListener("click", SeedTasks);
UI.btnClear.addEventListener("click", ClearTasks);
UI.btnSubmit.addEventListener("click", AddTask);

UI.taskList.addEventListener("click", (e) => {
  const btnDelete = e.target.closest(".btn-delete");
  if (btnDelete) {
    DeleteTask(btnDelete.dataset.id);
  }

  const btnAction = e.target.closest(".btn-action");
  if (btnAction) {
    TaskAction(btnAction.dataset.id, e);
  }
});

UI.btnReset.addEventListener("click", () => {
  UI.taskForm.reset();
  clearErrors();
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    AddTask(e);
  }
});

UI.btnAll.addEventListener("click", () => {
  filterTasks("all");
});
UI.btnPending.addEventListener("click", () => {
  filterTasks("pending");
});
UI.btnDone.addEventListener("click", () => {
  filterTasks("done");
});

UI.searchInput.addEventListener(
  "input",
  Debounce(async (e) => {
    const query = e.target.value;
    const Tasks = await _SearchInIndexedDB(query);

    UI.taskList.innerHTML = "";
    removeEmptyState();

    for (const task of Tasks) {
      const taskElement = returnHTMLTask(task);
      UI.taskList.insertAdjacentHTML("afterbegin", taskElement);
    }
    if (Tasks.length === 0) {
      RenderHTMLCleanTasks();
    }
    updateTaskStatus();
  }),
);

function Debounce(func, wait = 500) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function clearErrors() {
  showFieldError(UI.titleInput, false);
  showFieldError(UI.descriptionInput, false);
}

function removeEmptyState() {
  const emptyState = document.getElementById("emptyState");
  if (emptyState) {
    emptyState.remove();
    UI.taskList.classList.remove("task-list");
  }
}

function showFieldError(
  inputElement,
  show,
  message = "This field is required",
) {
  // Finds error element by ID convention (e.g., 'title' -> 'titleError')
  const errorElement =
    document.getElementById(`${inputElement.id} Error`) ||
    inputElement.nextElementSibling;

  if (!errorElement) return;

  if (show) {
    if (message) errorElement.textContent = message;
    errorElement.style.display = "block";
  } else {
    errorElement.style.display = "none";
  }
}

function validateTaskInputs(title, description) {
  const isTitleValid = Boolean(title);
  const isDescriptionValid = Boolean(description);

  showFieldError(UI.titleInput, !isTitleValid, "Title is required");
  showFieldError(
    UI.descriptionInput,
    !isDescriptionValid,
    "Description is required",
  );

  return isTitleValid && isDescriptionValid;
}
function returnHTMLTask(task) {
  return `<div id="task-${task.Id}" class="task-card ${task.status === "done" ? "done" : ""}">
        <div class="card-header">
          <h3 class="card-title">${task.title}</h3>
          <div class="card-actions">
            <button data-id="${task.Id}" class="btn btn-action">Mark Pending 🔄</button>
            <button data-id="${task.Id}" class="btn btn-delete">Delete 🗑️</button>
            </div>
        </div>

        <p class="card-description">
            ${task.description}
        </p>

        <div class="card-footer">
            <div class="tags">
            <span class="badge">#${task.Id}</span>
            <span class="badge">pending</span>
            <span class="badge">Created:${new Date().toLocaleString()}</span>
            </div>
        </div>
    </div>`;
}

function RenderHTMLCleanTasks() {
  UI.taskList.innerHTML = `
  <div id="emptyState" class="empty-state">
    No tasks match your filter/search.
  </div>`;
  UI.taskList.classList.add("task-list");
}

function _AddToIndexedDB(task) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["tasks"], "readwrite");
    const store = transaction.objectStore("tasks");
    const request = store.add(task);

    request.onsuccess = function () {
      console.log("Task added to IndexedDB:", task);
      resolve(request.result);
    };

    request.onerror = function (event) {
      console.error("Error adding task to IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
}

function _DeleteFromIndexedDB(taskId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["tasks"], "readwrite");
    const store = transaction.objectStore("tasks");
    const request = store.delete(taskId);

    request.onsuccess = function () {
      console.log(`Task with ID ${taskId} deleted from IndexedDB`);
      resolve();
    };

    request.onerror = function (event) {
      console.error(
        `Error deleting task with ID ${taskId} from IndexedDB:`,
        event.target.error,
      );
      reject(event.target.error);
    };
  });
}

function _FindInIndexedDB(taskId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    const request = store.get(taskId);

    request.onsuccess = function () {
      if (request.result) {
        console.log(
          `Task with ID ${taskId} found in IndexedDB:`,
          request.result,
        );
        resolve(request.result);
      } else {
        console.log(`Task with ID ${taskId} not found in IndexedDB`);
        resolve(null);
      }
    };

    request.onerror = function (event) {
      console.error(
        `Error finding task with ID ${taskId} in IndexedDB:`,
        event.target.error,
      );
      reject(event.target.error);
    };
  });
}

function _GetAllTasksFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    const request = store.getAll();

    request.onsuccess = function () {
      console.log("All tasks retrieved from IndexedDB:", request.result);
      resolve(request.result);
    };

    request.onerror = function (event) {
      console.error(
        "Error retrieving all tasks from IndexedDB:",
        event.target.error,
      );
      reject(event.target.error);
    };
  });
}

function _updateTaskInIndexedDB(task) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["tasks"], "readwrite");
    const store = transaction.objectStore("tasks");
    const request = store.put(task);

    request.onsuccess = function () {
      console.log(`Task with ID ${task.Id} updated in IndexedDB`);
      resolve();
    };

    request.onerror = function (event) {
      console.error(
        `Error updating task with ID ${task.Id} in IndexedDB:`,
        event.target.error,
      );
      reject(event.target.error);
    };
  });
}

function _SearchInIndexedDB(query) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    const request = store.getAll();

    request.onsuccess = function () {
      const results = request.result.filter(
        (task) =>
          task.title.toLowerCase().includes(query.toLowerCase()) ||
          task.description.toLowerCase().includes(query.toLowerCase()),
      );
      console.log(`Search results for query "${query}":`, results);
      resolve(results);
    };

    request.onerror = function (event) {
      console.error(
        `Error searching tasks in IndexedDB for query "${query}":`,
        event.target.error,
      );
      reject(event.target.error);
    };
  });
}

function ClearTasks() {
  RenderHTMLCleanTasks();
  db.transaction(["tasks"], "readwrite").objectStore("tasks").clear();
  updateTaskStatus();
}

async function SeedTasks() {
  const Task = [
    {
      title: "Seeded Task",
      description: "This is a seeded task.",
      status: "pending",
    },
    {
      title: "Another Seeded Task",
      description: "This is another seeded task.",
      status: "pending",
    },
    {
      title: "koko Seeded Task",
      description: "This is a koko seeded task.",
      status: "pending",
    },
  ];

  removeEmptyState();
  for (const task of Task) {
    const IndexedDBKey = await _AddToIndexedDB(task);
    task.Id = IndexedDBKey;
    const taskElement = returnHTMLTask(task);
    UI.taskList.insertAdjacentHTML("afterbegin", taskElement);
  }
  updateTaskStatus();
}

async function AddTask(event) {
  event.preventDefault();
  const title = UI.titleInput.value.trim();
  const description = UI.descriptionInput.value.trim();

  if (!validateTaskInputs(title, description)) {
    setErrorHandler(title, description);
    return;
  }
  const task = {
    title,
    description,
    status: "pending",
  };
  task.Id = await _AddToIndexedDB(task);

  removeEmptyState();
  const taskElement = returnHTMLTask(task);
  UI.taskList.insertAdjacentHTML("afterbegin", taskElement);
  updateTaskStatus();
}

async function DeleteTask(taskId) {
  await _DeleteFromIndexedDB(parseInt(taskId));
  const cardTask = document.getElementById(`task-${taskId}`);
  cardTask.classList.add("deleting");
  const deleteTimeout = setTimeout(() => {
    if (cardTask) {
      cardTask.remove();
    }
  }, 300);
  clearTimeout(deleteTimeout);
  updateTaskStatus();
}

async function TaskAction(taskId, event) {
  const task = await _FindInIndexedDB(parseInt(taskId));
  if (!task) return;

  task.status = task.status === "pending" ? "done" : "pending";
  await _updateTaskInIndexedDB(task);

  const cardTask = event.target.closest(".task-card");
  cardTask.classList.toggle("done", task.status === "done");

  const actionButton = event.target.closest(".btn-action");
  actionButton.textContent =
    task.status === "pending" ? "Mark Done ✅" : "Mark Pending 🔄";

  const statusBadge = event.target
    .closest(".task-card")
    .querySelector(".badge:nth-child(2)");
  statusBadge.textContent = task.status;
  updateTaskStatus();
}

async function updateTaskStatus() {
  const Tasks = await _GetAllTasksFromIndexedDB();

  UI.totalCount.textContent = Tasks.length;
  UI.pendingCount.textContent = Tasks.filter(
    (task) => task.status === "pending",
  ).length;
  UI.doneCount.textContent = Tasks.filter(
    (task) => task.status === "done",
  ).length;

  if (UI.taskList.querySelector(".empty-state")) {
    UI.shownCount.textContent = 0;
  } else {
    UI.shownCount.textContent = UI.taskList.children.length;
  }
}

async function filterTasks(filter) {
  const Tasks = await _GetAllTasksFromIndexedDB();
  const filteredTasks = Tasks.filter((task) => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  UI.taskList.innerHTML = "";

  for (const task of filteredTasks) {
    const taskElement = returnHTMLTask(task);
    UI.taskList.insertAdjacentHTML("afterbegin", taskElement);
  }
  if (filteredTasks.length === 0) {
    RenderHTMLCleanTasks();
  }
  updateTaskStatus();
}

"use strict";

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/a/macros/blindit.org/s/AKfycbx3-wHOQziieRXZScB8YvLqe_cnfniRcEpfYKhw6kEhXBKZWwq6R7U73WwAq1P2xbUl/exec";

/*
  Plan A — nextGen app.js
  Expected path:
  nextGen/js/app.js

  Expected HTML:
  nextGen/html/index.html
*/

const assessmentState = {
  currentSection: "homeSection",
  startedAt: null,
  finishedAt: null,
  focusChanges: 0,
  mouseEvents: 0,
  results: {
    form: false,
    recordSearch: false,
    onboarding: false,
    inboxTriage: false,
    rosterTable: false
  }
};

let googleSheetSubmissionStarted = false;
let googleSheetSubmissionCompleted = false;
let googleSheetSubmissionStatus = "Not submitted";

const sectionOrder = [
  "homeSection",
  "formTaskSection",
  "recordSearchSection",
  "onboardingSection",
  "inboxTriageSection",
  "rosterTableSection"
];

const progressLabels = {
  homeSection: "Progress: Home",
  formTaskSection: "Progress: Task 1 of 5",
  recordSearchSection: "Progress: Task 2 of 5",
  onboardingSection: "Progress: Task 3 of 5",
  inboxTriageSection: "Progress: Task 4 of 5",
  rosterTableSection: "Progress: Task 5 of 5"
};

function byId(id) {
  return document.getElementById(id);
}

function sayPolite(message) {
  const region = byId("livePolite");
  if (!region) return;
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 10);
}

function sayAssert(message) {
  const region = byId("liveAssert");
  if (!region) return;
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 10);
}

function showSection(sectionId) {
  sectionOrder.forEach((id) => {
    const section = byId(id);
    if (section) {
      section.hidden = id !== sectionId;
    }
  });

  assessmentState.currentSection = sectionId;

  const progress = byId("progressText");
  if (progress) {
    progress.textContent = progressLabels[sectionId] || "";
  }

  const activeSection = byId(sectionId);
  const heading = activeSection ? activeSection.querySelector("h2, h3, h1") : null;

  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }

  sayPolite(progressLabels[sectionId] || "Section changed.");
}

function goToNextSection() {
  const currentIndex = sectionOrder.indexOf(assessmentState.currentSection);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= sectionOrder.length) {
    showFinalModal();
    return;
  }

  showSection(sectionOrder[nextIndex]);
}

function goToPreviousSection() {
  const currentIndex = sectionOrder.indexOf(assessmentState.currentSection);
  const previousIndex = Math.max(0, currentIndex - 1);
  showSection(sectionOrder[previousIndex]);
}

function startAssessmentTimer() {
  if (!assessmentState.startedAt) {
    assessmentState.startedAt = Date.now();
  }
}

function formatTimeSpent() {
  if (!assessmentState.startedAt || !assessmentState.finishedAt) {
    return "Not available";
  }

  const seconds = Math.round((assessmentState.finishedAt - assessmentState.startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes} minute(s), ${remainingSeconds} second(s)`;
}

function getOverallPass() {
  return (
    assessmentState.results.form &&
    assessmentState.results.recordSearch &&
    assessmentState.results.onboarding &&
    assessmentState.results.inboxTriage &&
    assessmentState.results.rosterTable
  );
}

function passFail(value) {
  return value ? "Pass" : "Fail";
}

function buildGoogleSheetPayload() {
  return {
    participantName: byId("formFullName")?.value.trim() || "",
    emailAddress: byId("formEmail")?.value.trim() || "",
    overallResult: getOverallPass() ? "Pass" : "Fail",
    timeSpent: formatTimeSpent(),
    focusChanges: assessmentState.focusChanges,
    mouseEvents: assessmentState.mouseEvents,
    task1StandardForm: passFail(assessmentState.results.form),
    task2RecordSearch: passFail(assessmentState.results.recordSearch),
    task3EmployeeOnboarding: passFail(assessmentState.results.onboarding),
    task4InboxTriage: passFail(assessmentState.results.inboxTriage),
    task5TableToForm: passFail(assessmentState.results.rosterTable)
  };
}

async function submitResultsToGoogleSheet() {
  if (googleSheetSubmissionStarted) {
    return;
  }

  googleSheetSubmissionStarted = true;
  googleSheetSubmissionStatus = "Submitting";

  const payload = buildGoogleSheetPayload();

  try {
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      keepalive: true
    });

    googleSheetSubmissionCompleted = true;
    googleSheetSubmissionStatus = "Submission request sent";
  } catch (error) {
    googleSheetSubmissionCompleted = false;
    googleSheetSubmissionStatus = "Submission failed";
    console.error("Google Sheet submission failed:", error);
  }
}


function showFinalModal() {
  if (!assessmentState.finishedAt) {
    assessmentState.finishedAt = Date.now();
  }
  const passed = getOverallPass();

  const modalBackdrop = document.createElement("div");
  modalBackdrop.id = "finalAssessmentModalBackdrop";
  modalBackdrop.className = "modal-backdrop";
  modalBackdrop.style.position = "fixed";
  modalBackdrop.style.inset = "0";
  modalBackdrop.style.background = "rgba(0, 0, 0, .55)";
  modalBackdrop.style.display = "flex";
  modalBackdrop.style.alignItems = "center";
  modalBackdrop.style.justifyContent = "center";
  modalBackdrop.style.padding = "1rem";
  modalBackdrop.style.zIndex = "9999";

  modalBackdrop.innerHTML = `
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalModalHeading"
      aria-describedby="finalModalMessage finalMetricsRegion"
      style="background:#fff;color:#111;border:2px solid #111;border-radius:8px;max-width:40rem;width:100%;padding:1.5rem;"
    >
      <section aria-labelledby="finalModalHeading">
        <h2 id="finalModalHeading">${passed ? "Success!" : "Fail!"}</h2>
        <p id="finalModalMessage">${passed ? "You have passed this Assessment." : "You have failed this Assessment."}</p>
      </section>

      <section id="finalMetricsRegion" aria-labelledby="finalMetricsHeading">
        <h3 id="finalMetricsHeading">Assessment Metrics</h3>
        <dl>
          <dt>Time spent</dt>
          <dd>${formatTimeSpent()}</dd>

          <dt>Focus changes</dt>
          <dd>${assessmentState.focusChanges}</dd>

          <dt>Mouse events</dt>
          <dd>${assessmentState.mouseEvents}</dd>

          <dt>Form Navigation</dt>
          <dd>${passFail(assessmentState.results.form)}</dd>

          <dt>Record Search</dt>
          <dd>${passFail(assessmentState.results.recordSearch)}</dd>

          <dt>Employee Onboarding</dt>
          <dd>${passFail(assessmentState.results.onboarding)}</dd>

          <dt>Inbox Triage</dt>
          <dd>${passFail(assessmentState.results.inboxTriage)}</dd>
          
          <dt>Employee Roster</dt>
          <dd>${passFail(assessmentState.results.rosterTable)}</dd>

<dt>Google Sheet Submission</dt>
<dd>${googleSheetSubmissionStatus}</dd>
</dl>
      </section>

      <button id="finalModalCloseBtn" class="btn" type="button">Close</button>
    </div>
  `;

  document.body.appendChild(modalBackdrop);

  const closeBtn = byId("finalModalCloseBtn");
  if (closeBtn) {
    closeBtn.focus();
    closeBtn.addEventListener("click", closeFinalModalAndReset);
  }
}

function closeFinalModalAndReset() {
  const modal = byId("finalAssessmentModalBackdrop");
  if (modal) {
    modal.remove();
  }

  resetAssessment();
}

function resetAssessment() {
  assessmentState.currentSection = "homeSection";
  assessmentState.startedAt = null;
  assessmentState.finishedAt = null;
  assessmentState.focusChanges = 0;
  assessmentState.mouseEvents = 0;

googleSheetSubmissionStarted = false;
googleSheetSubmissionCompleted = false;
googleSheetSubmissionStatus = "Not submitted";

  assessmentState.results.form = false;
  assessmentState.results.recordSearch = false;
  assessmentState.results.onboarding = false;
  assessmentState.results.inboxTriage = false;
  assessmentState.results.rosterTable = false;

  resetHome();
  resetFormTask();
  resetRecordSearchTask();
  resetOnboardingTask();
  resetInboxTask();
  resetRosterTask();

  showSection("homeSection");
}

/* Metrics */

document.addEventListener("focusin", () => {
  assessmentState.focusChanges += 1;
});

document.addEventListener("mousedown", () => {
  assessmentState.mouseEvents += 1;
});

document.addEventListener("click", () => {
  assessmentState.mouseEvents += 1;
});

document.addEventListener("keydown", (event) => {
  const modal = byId("finalAssessmentModalBackdrop");

  if (event.key === "Escape" && modal) {
    event.preventDefault();
    closeFinalModalAndReset();
  }
});

/* Home */

function resetHome() {
  const form = byId("preForm");
  const status = byId("homeStatus");

  if (form) form.reset();
  if (status) status.textContent = "";
  updateHomeStartButtonState();
}

function updateHomeStartButtonState() {
  const startBtn = byId("startCalibrationBtn");
  const consent = byId("homeConsent");

  if (!startBtn || !consent) return;

  startBtn.disabled = !consent.checked;
}

function initHome() {
  const startBtn = byId("startCalibrationBtn");
  const consent = byId("homeConsent");
  const status = byId("homeStatus");

  if (!startBtn) return;

  updateHomeStartButtonState();

  if (consent) {
    consent.addEventListener("change", () => {
      updateHomeStartButtonState();

      if (status) {
        status.textContent = consent.checked
          ? "Start Assessment is now available."
          : "Consent is required before starting.";
      }
    });
  }

  startBtn.addEventListener("click", () => {
    if (!consent || !consent.checked) {
      if (status) {
        status.textContent = "Accept consent to begin the assessment.";
      }
      sayAssert("Accept consent to begin the assessment.");
      return;
    }

    startAssessmentTimer();
    showSection("formTaskSection");
  });
}

/* Form Task */

let formTaskStarted = false;

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formTaskIsValid() {
  const name = byId("formFullName");
  const email = byId("formEmail");
  const feedback = byId("formFeedback");
  const confirm = byId("formConfirmComplete");

  return Boolean(
    name &&
    email &&
    feedback &&
    confirm &&
    name.value.trim() &&
    isValidEmail(email.value) &&
    feedback.value.trim() &&
    confirm.checked
  );
}

function resetFormTask() {
  formTaskStarted = false;

  const form = byId("formTaskForm");
  const beginBtn = byId("formBeginTaskBtn");
  const finishBtn = byId("formFinishTaskBtn");
  const status = byId("formTaskStatus");

  if (form) {
    form.reset();
    form.hidden = true;
  }

  if (beginBtn) beginBtn.disabled = false;
  if (finishBtn) finishBtn.disabled = true;
  if (status) status.textContent = "";
}

function initFormTask() {
  const form = byId("formTaskForm");
  const beginBtn = byId("formBeginTaskBtn");
  const finishBtn = byId("formFinishTaskBtn");
  const prevBtn = byId("formPreviousTaskBtn");
  const status = byId("formTaskStatus");

  if (beginBtn) {
    beginBtn.addEventListener("click", () => {
      formTaskStarted = true;

      if (form) {
        form.hidden = false;
      }

      beginBtn.disabled = true;

      if (status) {
        status.textContent = "Form unlocked. Please complete all fields.";
      }

      sayPolite("Task started. Form fields are now available.");
    });
  }

  if (form) {
    form.addEventListener("input", () => {
      if (!formTaskStarted || !finishBtn) return;
      finishBtn.disabled = !formTaskIsValid();
    });

    form.addEventListener("change", () => {
      if (!formTaskStarted || !finishBtn) return;
      finishBtn.disabled = !formTaskIsValid();
    });
  }

  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      if (!formTaskStarted) {
        sayAssert("You must begin the task first.");
        return;
      }

      assessmentState.results.form = formTaskIsValid();

      if (status) {
        status.textContent = "Form task complete. Moving to record search.";
      }

      showSection("recordSearchSection");
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", goToPreviousSection);
  }
}

/* Record Search Task */

const records = [
  { id: "jordan-smith", name: "Jordan Smith", department: "Information Technology", status: "Pending", caseType: "Access Request", lastContactDate: "May 9, 2026", owner: "Andre Miller" },
  { id: "jordan-li", name: "Jordan Li", department: "Operations", status: "Closed", caseType: "Equipment Request", lastContactDate: "April 28, 2026", owner: "Priya Shah" },
  { id: "jordan-le", name: "Jordan Le", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Raya Chen" },
  { id: "jordan-lee-hr-pending", name: "Jordan Lee", department: "Human Resources", status: "Pending", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-lee-correct", name: "Jordan Lee", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-lee-benefits", name: "Jordan Lee", department: "Human Resources", status: "Active", caseType: "Benefits Question", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-lee-june", name: "Jordan Lee", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "June 3, 2026", owner: "Maya Chen" },
  { id: "jordan-lee-owner", name: "Jordan Lee", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Mia Chen" },
  { id: "jordan-lee-legal", name: "Jordan Lee", department: "Legal", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-lee-inactive", name: "Jordan Lee", department: "Human Resources", status: "Inactive", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-leigh", name: "Jordan Leigh", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-lea", name: "Jordan Lea", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordan-lee-jr", name: "Jordan Lee Jr.", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jordyn-lee", name: "Jordyn Lee", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" },
  { id: "jorden-lee", name: "Jorden Lee", department: "Human Resources", status: "Active", caseType: "Accommodation Review", lastContactDate: "May 14, 2026", owner: "Maya Chen" }
];

let recordCheckedRecord = null;
let recordMovedRecord = null;

function resetRecordSearchTask() {
  recordCheckedRecord = null;
  recordMovedRecord = null;

  const input = byId("recordSearchInput");
  const moveBtn = byId("recordMoveSelectedBtn");
  const submitBtn = byId("recordSubmitAnswerBtn");
  const resultsBody = byId("recordSearchResultsBody");
  const selectedBody = byId("recordSelectedRecordsBody");
  const searchStatus = byId("recordSearchStatus");
  const answerStatus = byId("recordAnswerStatus");

  if (input) input.value = "";
  if (moveBtn) moveBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (resultsBody) resultsBody.innerHTML = '<tr><td colspan="7">No search has been performed yet.</td></tr>';
  if (selectedBody) selectedBody.innerHTML = '<tr><td colspan="6">No records have been selected yet.</td></tr>';
  if (searchStatus) searchStatus.textContent = "";
  if (answerStatus) answerStatus.textContent = "";
}

function renderRecordSearchResults(matches) {
  const resultsBody = byId("recordSearchResultsBody");
  const moveBtn = byId("recordMoveSelectedBtn");
  const answerStatus = byId("recordAnswerStatus");
  const searchStatus = byId("recordSearchStatus");

  recordCheckedRecord = null;

  if (moveBtn) moveBtn.disabled = true;
  if (answerStatus) answerStatus.textContent = "";

  if (!resultsBody) return;

  if (matches.length === 0) {
    resultsBody.innerHTML = '<tr><td colspan="7">No matching records found.</td></tr>';
    if (searchStatus) searchStatus.textContent = "No matching records found.";
    return;
  }

  resultsBody.innerHTML = "";

  matches.forEach((record) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input type="checkbox" name="recordChoice" aria-label="Select ${record.name}"></td>
      <td>${record.name}</td>
      <td>${record.department}</td>
      <td>${record.status}</td>
      <td>${record.caseType}</td>
      <td>${record.lastContactDate}</td>
      <td>${record.owner}</td>
    `;

    const checkbox = row.querySelector("input");

    checkbox.addEventListener("change", () => {
      document.querySelectorAll('input[name="recordChoice"]').forEach((box) => {
        if (box !== checkbox) box.checked = false;
      });

      recordCheckedRecord = checkbox.checked ? record : null;

      if (moveBtn) {
        moveBtn.disabled = !recordCheckedRecord;
      }
    });

    resultsBody.appendChild(row);
  });

  if (searchStatus) {
    searchStatus.textContent = `${matches.length} matching records found.`;
  }
}

function initRecordSearchTask() {
  const form = byId("recordSearchForm");
  const input = byId("recordSearchInput");
  const resetBtn = byId("recordResetSearchBtn");
  const moveBtn = byId("recordMoveSelectedBtn");
  const submitBtn = byId("recordSubmitAnswerBtn");
  const prevBtn = byId("recordPreviousTaskBtn");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const searchValue = input ? input.value.trim().toLowerCase() : "";

      const matches = records.filter((record) => {
        return record.name.toLowerCase().includes(searchValue);
      });

      renderRecordSearchResults(matches);
    });
  }

  if (moveBtn) {
    moveBtn.addEventListener("click", () => {
      if (!recordCheckedRecord) return;

      recordMovedRecord = recordCheckedRecord;

      const selectedBody = byId("recordSelectedRecordsBody");
      const searchStatus = byId("recordSearchStatus");

      if (selectedBody) {
        selectedBody.innerHTML = `
          <tr>
            <td>${recordMovedRecord.name}</td>
            <td>${recordMovedRecord.department}</td>
            <td>${recordMovedRecord.status}</td>
            <td>${recordMovedRecord.caseType}</td>
            <td>${recordMovedRecord.lastContactDate}</td>
            <td>${recordMovedRecord.owner}</td>
          </tr>
        `;
      }

      if (submitBtn) {
        submitBtn.disabled = false;
      }

      if (searchStatus) {
        searchStatus.textContent = `${recordMovedRecord.name} has been moved to the Selected Records table.`;
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      assessmentState.results.recordSearch =
        Boolean(recordMovedRecord && recordMovedRecord.id === "jordan-lee-correct");

      showSection("onboardingSection");
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetRecordSearchTask);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", goToPreviousSection);
  }
}

/* Employee Onboarding Task */

function showOnboardingStep(stepId) {
  [
    "onboardingStep1",
    "onboardingStep2",
    "onboardingStep3",
    "onboardingReviewSection"
  ].forEach((id) => {
    const section = byId(id);
    if (section) section.hidden = id !== stepId;
  });

  const heading = byId(stepId)?.querySelector("h3");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }
}

function onboardingIsCorrect() {
  const firstName = byId("onboardingFirstName")?.value.trim();
  const lastName = byId("onboardingLastName")?.value.trim();
  const employeeId = byId("onboardingEmployeeId")?.value.trim();
  const startDate = byId("onboardingStartDate")?.value.trim();

  const department = byId("onboardingDepartment")?.value;
  const manager = byId("onboardingManager")?.value;

  const laptop = byId("onboardingLaptop")?.checked;
  const mobile = byId("onboardingMobileDevice")?.checked;
  const monitor = byId("onboardingMonitor")?.checked;
  const printer = byId("onboardingPrinter")?.checked;
  const screenReader = byId("onboardingScreenReader")?.checked;
  const webcam = byId("onboardingWebcam")?.checked;

  return (
    firstName === "Alex" &&
    lastName === "Martinez" &&
    employeeId === "48392" &&
    startDate === "July 15, 2026" &&
    department === "Human Resources" &&
    manager === "Maya Chen" &&
    laptop &&
    monitor &&
    screenReader &&
    !mobile &&
    !printer &&
    !webcam
  );
}

function resetOnboardingTask() {
  const form = byId("onboardingForm");
  const status = byId("onboardingStatus");

  if (form) form.reset();
  if (status) status.textContent = "";

  showOnboardingStep("onboardingStep1");
}

function initOnboardingTask() {
  byId("onboardingNextStep1Btn")?.addEventListener("click", () => {
    showOnboardingStep("onboardingStep2");
  });

  byId("onboardingPreviousStep2Btn")?.addEventListener("click", () => {
    showOnboardingStep("onboardingStep1");
  });

  byId("onboardingNextStep2Btn")?.addEventListener("click", () => {
    showOnboardingStep("onboardingStep3");
  });

  byId("onboardingPreviousStep3Btn")?.addEventListener("click", () => {
    showOnboardingStep("onboardingStep2");
  });

  byId("onboardingReviewBtn")?.addEventListener("click", () => {
    showOnboardingStep("onboardingReviewSection");
  });

  byId("onboardingPreviousReviewBtn")?.addEventListener("click", () => {
    showOnboardingStep("onboardingStep3");
  });

  byId("onboardingSubmitBtn")?.addEventListener("click", () => {
    assessmentState.results.onboarding = onboardingIsCorrect();
    showSection("inboxTriageSection");
  });

  byId("onboardingPreviousTaskBtn")?.addEventListener("click", goToPreviousSection);
}

/* Inbox Triage Task */

const emails = [
  { id: "audit-schedule-update", sender: "RJ Holliday", subject: "Q2 Accessibility Audit Schedule Update", received: "June 10, 2026, 8:14 AM", priority: "Normal", category: "Accessibility", status: "Unread", archived: false, body: `<p>Hi team,</p><p>The Q2 accessibility audit schedule has been updated. The testing window is still being finalized, and the reporting deadline will be confirmed after the client review.</p><p>Please hold questions until the revised calendar is posted.</p>` },
  { id: "q2-audit-notes", sender: "Priya Shah", subject: "Q2 Audit Notes and Reminders", received: "June 10, 2026, 9:02 AM", priority: "Low", category: "Internal", status: "Read", archived: false, body: `<p>Good morning,</p><p>These are general notes from the Q2 audit planning meeting. Please review the meeting summary when you have time.</p>` },
  { id: "accessibility-review-follow-up", sender: "Maya Chen", subject: "Accessibility Review Follow-Up", received: "June 10, 2026, 10:18 AM", priority: "Normal", category: "Accessibility", status: "Unread", archived: false, body: `<p>Hello,</p><p>Following up on the accessibility review discussion. This message is about the review checklist, not the final Q2 audit deadline.</p><p>Thanks,</p><p>Maya</p>` },
  { id: "q2-accessibility-report", sender: "Andre Miller", subject: "Q2 Accessibility Report Draft", received: "June 10, 2026, 11:27 AM", priority: "Normal", category: "Reports", status: "Read", archived: false, body: `<p>The Q2 accessibility report draft is ready for internal comments. This is not the final audit request.</p>` },
  { id: "audit-client-question", sender: "Carlos Rivera", subject: "Client Question About Accessibility Audit", received: "June 11, 2026, 8:49 AM", priority: "Normal", category: "Client", status: "Unread", archived: false, body: `<p>The client asked whether the audit will include mobile screens. Please confirm scope before responding.</p>` },
  { id: "q2-accessibility-audit-final", sender: "Maya Chen", subject: "Q2 Accessibility Audit Request", received: "June 11, 2026, 9:33 AM", priority: "High", category: "Accessibility", status: "Unread", archived: false, body: `<p>Hello,</p><p>Please begin the Q2 accessibility audit request for the internal benefits portal. The audit should include keyboard navigation, screen reader testing, headings, forms, tables, and status messages.</p><p>The audit deadline is <strong>June 21, 2026</strong>. Please make sure the final notes are ready before that date so the report can be reviewed.</p><p>Thank you,</p><p>Maya Chen</p>` },
  { id: "q2-accessibility-audit-reminder", sender: "Maya Chin", subject: "Q2 Accessibility Audit Reminder", received: "June 11, 2026, 10:05 AM", priority: "High", category: "Accessibility", status: "Unread", archived: false, body: `<p>This is a reminder about a different accessibility audit. The working checkpoint date is June 14, 2026.</p>` },
  { id: "audit-deadline-question", sender: "Maya Chen", subject: "Question About Audit Deadline", received: "June 11, 2026, 11:22 AM", priority: "Normal", category: "Accessibility", status: "Read", archived: false, body: `<p>I had a question about whether the deadline should move to July 1, 2026. No final change has been approved.</p>` },
  { id: "accessibility-audit-q2-files", sender: "Nina Patel", subject: "Accessibility Audit Q2 Files", received: "June 12, 2026, 7:58 AM", priority: "Low", category: "Files", status: "Read", archived: false, body: `<p>The supporting files for the Q2 audit have been uploaded to the shared folder.</p>` },
  { id: "q2-review-portal", sender: "Maya Chen", subject: "Q2 Review for Benefits Portal", received: "June 12, 2026, 9:10 AM", priority: "High", category: "Review", status: "Unread", archived: false, body: `<p>The benefits portal review is separate from the Q2 accessibility audit request. Please use July 15, 2026 for the review planning milestone only.</p>` },
  { id: "audit-kickoff", sender: "RJ Holliday", subject: "Accessibility Audit Kickoff", received: "June 12, 2026, 10:40 AM", priority: "Normal", category: "Meetings", status: "Unread", archived: false, body: `<p>The audit kickoff meeting is scheduled. Please review agenda items before the meeting.</p>` },
  { id: "q2-accessibility-audit-change", sender: "Maya Chen", subject: "Q2 Accessibility Audit Change Request", received: "June 12, 2026, 1:15 PM", priority: "High", category: "Accessibility", status: "Unread", archived: false, body: `<p>This change request applies to the training site audit. The requested completion date is July 1, 2026.</p>` },
  { id: "accessibility-audit-attachments", sender: "Derek Stone", subject: "Accessibility Audit Attachments", received: "June 13, 2026, 8:20 AM", priority: "Normal", category: "Files", status: "Read", archived: false, body: `<p>Attached are screenshots and notes from the prior accessibility audit cycle.</p>` },
  { id: "q2-audit-assignment", sender: "Maya Chen", subject: "Q2 Audit Assignment", received: "June 13, 2026, 9:45 AM", priority: "Normal", category: "Assignments", status: "Unread", archived: false, body: `<p>You have been assigned to support the Q2 audit workstream. This is an assignment notice, not the request containing the final deadline.</p>` },
  { id: "accessibility-audit-summary", sender: "Priya Shah", subject: "Accessibility Audit Summary", received: "June 13, 2026, 11:08 AM", priority: "Low", category: "Reports", status: "Read", archived: false, body: `<p>The accessibility audit summary from last quarter is available for review.</p>` },
  { id: "q2-accessibility-final-reminder", sender: "Maya Chen", subject: "Final Reminder: Q2 Accessibility Work", received: "June 14, 2026, 8:30 AM", priority: "High", category: "Accessibility", status: "Unread", archived: false, body: `<p>This reminder refers to Q2 accessibility work generally. Please refer to the original audit request for the official deadline.</p>` }
];

let visibleEmails = [];
let currentEmailIndex = -1;
let continuedEmailId = null;

function getActiveEmails() {
  const query = byId("inboxSearchInput")?.value.trim().toLowerCase() || "";
  const priority = byId("inboxPriorityFilter")?.value || "all";

  return emails.filter((email) => {
    const matchesArchive = !email.archived;
    const matchesPriority = priority === "all" || email.priority === priority;
    const matchesQuery =
      query === "" ||
      email.sender.toLowerCase().includes(query) ||
      email.subject.toLowerCase().includes(query) ||
      email.category.toLowerCase().includes(query) ||
      email.body.toLowerCase().includes(query);

    return matchesArchive && matchesPriority && matchesQuery;
  });
}

function renderInbox() {
  const inboxBody = byId("inboxBody");
  const status = byId("inboxTaskStatus");

  if (!inboxBody) return;

  visibleEmails = getActiveEmails();
  inboxBody.innerHTML = "";

  if (visibleEmails.length === 0) {
    inboxBody.innerHTML = '<tr><td colspan="7">No messages found.</td></tr>';
    if (status) status.textContent = "No messages found.";
    return;
  }

  visibleEmails.forEach((email, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input type="checkbox" id="select-${email.id}" data-email-id="${email.id}" aria-label="Select email: ${email.subject}"></td>
      <td>${email.status}</td>
      <td>${email.sender}</td>
      <td><a href="#" data-email-index="${index}">${email.subject}</a></td>
      <td>${email.received}</td>
      <td>${email.priority}</td>
      <td>${email.category}</td>
    `;

    const subjectLink = row.querySelector("a");

    subjectLink.addEventListener("click", (event) => {
      event.preventDefault();
      openEmail(index);
    });

    inboxBody.appendChild(row);
  });

  if (status) status.textContent = `${visibleEmails.length} messages displayed.`;
}

function openEmail(index) {
  currentEmailIndex = index;
  const email = visibleEmails[currentEmailIndex];

  if (!email) return;

  hideInboxQuestion();

  email.status = "Read";

  byId("inboxView").hidden = true;
  byId("messageView").hidden = false;

  byId("messageSender").textContent = email.sender;
  byId("messageSubject").textContent = email.subject;
  byId("messageReceived").textContent = email.received;
  byId("messagePriority").textContent = email.priority;
  byId("messageCategory").textContent = email.category;
  byId("messageBody").innerHTML = email.body;

  byId("inboxPreviousEmailBtn").disabled = currentEmailIndex === 0;
  byId("inboxNextEmailBtn").disabled = currentEmailIndex === visibleEmails.length - 1;

  const heading = byId("messageHeading");
  if (heading) heading.focus();

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = `Email opened: ${email.subject}.`;
}

function returnToInbox() {
  hideInboxQuestion();

  byId("messageView").hidden = true;
  byId("inboxView").hidden = false;

  renderInbox();

  const heading = byId("inboxHeading");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = "Returned to inbox.";
}

function openPreviousEmail() {
  if (currentEmailIndex > 0) {
    openEmail(currentEmailIndex - 1);
  }
}

function openNextEmail() {
  if (currentEmailIndex < visibleEmails.length - 1) {
    openEmail(currentEmailIndex + 1);
  }
}

function showInboxQuestion() {
  const email = visibleEmails[currentEmailIndex];
  if (!email) return;

  continuedEmailId = email.id;

  const questionSection = byId("inboxQuestionSection");
  if (questionSection) questionSection.hidden = false;

  const heading = byId("inboxQuestionHeading");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = "Question section is now available.";
}

function hideInboxQuestion() {
  continuedEmailId = null;

  const questionSection = byId("inboxQuestionSection");
  const form = byId("inboxAnswerForm");

  if (questionSection) questionSection.hidden = true;
  if (form) form.reset();
}

function markSelectedAsRead() {
  const selectedBoxes = document.querySelectorAll('#inboxBody input[type="checkbox"]:checked');

  selectedBoxes.forEach((box) => {
    const email = emails.find((item) => item.id === box.dataset.emailId);
    if (email) email.status = "Read";
  });

  renderInbox();

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = `${selectedBoxes.length} selected message or messages marked as read.`;
}

function archiveSelected() {
  const selectedBoxes = document.querySelectorAll('#inboxBody input[type="checkbox"]:checked');

  selectedBoxes.forEach((box) => {
    const email = emails.find((item) => item.id === box.dataset.emailId);
    if (email) email.archived = true;
  });

  renderInbox();

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = `${selectedBoxes.length} selected message or messages archived.`;
}

function refreshInbox() {
  byId("inboxSearchInput").value = "";
  byId("inboxPriorityFilter").value = "all";

  emails.forEach((email) => {
    email.archived = false;
    email.status = email.id.includes("notes") || email.id.includes("report") || email.id.includes("files") || email.id.includes("summary") ? "Read" : "Unread";
  });

  renderInbox();

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = "Inbox refreshed.";
}

function resetInboxTask() {
  const form = byId("inboxAnswerForm");

  currentEmailIndex = -1;
  continuedEmailId = null;

  if (form) form.reset();

  const search = byId("inboxSearchInput");
  const filter = byId("inboxPriorityFilter");

  if (search) search.value = "";
  if (filter) filter.value = "all";

  emails.forEach((email) => {
    email.archived = false;
  });

  hideInboxQuestion();

  if (byId("messageView")) byId("messageView").hidden = true;
  if (byId("inboxView")) byId("inboxView").hidden = false;

  renderInbox();

  const status = byId("inboxTaskStatus");
  if (status) status.textContent = "";
}

function initInboxTask() {
  byId("inboxSearchBtn")?.addEventListener("click", renderInbox);
  byId("inboxPriorityFilter")?.addEventListener("change", renderInbox);
  byId("inboxRefreshBtn")?.addEventListener("click", refreshInbox);
  byId("inboxMarkReadBtn")?.addEventListener("click", markSelectedAsRead);
  byId("inboxArchiveBtn")?.addEventListener("click", archiveSelected);

  byId("inboxReturnBtn")?.addEventListener("click", returnToInbox);
  byId("inboxPreviousEmailBtn")?.addEventListener("click", openPreviousEmail);
  byId("inboxNextEmailBtn")?.addEventListener("click", openNextEmail);

  byId("inboxContinueBtn")?.addEventListener("click", showInboxQuestion);

  byId("inboxPreviousTaskBtn")?.addEventListener("click", goToPreviousSection);

  byId("inboxAnswerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedAnswer = document.querySelector('input[name="deadlineAnswer"]:checked');

    assessmentState.results.inboxTriage =
      continuedEmailId === "q2-accessibility-audit-final" &&
      selectedAnswer &&
      selectedAnswer.value === "June 21, 2026";

    showSection("rosterTableSection");
  });
}

/* Employee Roster Table Task (Task 5) */

function rosterAnswersAreCorrect() {
  const dept = byId("rosterAnswerDepartment")?.value.trim().toLowerCase();
  const mgr = byId("rosterAnswerManager")?.value.trim().toLowerCase();
  const emp = byId("rosterAnswerEmployee")?.value.trim().toLowerCase();

  return (
    dept === "human resources" &&
    mgr === "andre miller" &&
    emp === "elena torres"
  );
}

function resetRosterTask() {
  const form = byId("rosterAnswerForm");
  const beginBtn = byId("rosterBeginTaskBtn");
  const content = byId("rosterTaskContent");
  const status1 = byId("rosterTaskStatus");
  const status2 = byId("rosterAnswerStatus");

  if (form) form.reset();
  if (beginBtn) beginBtn.disabled = false;
  if (content) content.hidden = true;
  if (status1) status1.textContent = "";
  if (status2) status2.textContent = "";
}

function initRosterTask() {
  const beginBtn = byId("rosterBeginTaskBtn");
  const form = byId("rosterAnswerForm");
  const prevBtn = byId("rosterPreviousTaskBtn");

  if (beginBtn) {
    beginBtn.addEventListener("click", () => {
      beginBtn.disabled = true;
      const content = byId("rosterTaskContent");

      if (content) {
        content.hidden = false;
      }

      const heading = byId("rosterTableContentHeading");
      if (heading) {
        heading.focus();
      }

      sayPolite("Table task started. Employee roster and questions are now available.");
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      assessmentState.results.rosterTable = rosterAnswersAreCorrect();
      assessmentState.finishedAt = Date.now();

      await submitResultsToGoogleSheet();

      showFinalModal();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", goToPreviousSection);
  }
}

/* Init */

document.addEventListener("DOMContentLoaded", () => {
  initHome();
  initFormTask();
  initRecordSearchTask();
  initOnboardingTask();
  initInboxTask();
  initRosterTask();

  resetAssessment();
});
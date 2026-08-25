/* MUCHON_MANAGER_ESTIMATE_FORM_ASSET_V1 */
(function () {
  "use strict";

  var config = {
    appsScriptUrl: "https://script.google.com/macros/s/AKfycbzK3Nxdd0tk8vaQBMLyK1fTksDV9P0OcjAREVcRMBK4O3vmUdflrFx-EpB2k0OyCl2Xlg/exec",
    turnstileSiteKey: "0x4AAAAAADBoBZFH6-z5H4yB"
  };
  var phonePattern = /^(?:\d{9,11}|\d{2,3}-\d{3,4}-\d{4})$/;
  var attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "dclid", "gbraid", "wbraid"];

  function setStatus(form, message, state) {
    var status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message || "";
    status.dataset.state = state || "";
  }

  function alertStatus(form, message, state) {
    setStatus(form, message, state);
    window.alert(message);
  }

  function readAttribution() {
    var values = {};
    var query = new URLSearchParams(window.location.search);
    attributionKeys.forEach(function (key) {
      var incoming = query.get(key);
      try {
        if (incoming) sessionStorage.setItem("muchon_" + key, incoming);
        values[key] = incoming || sessionStorage.getItem("muchon_" + key) || "";
      } catch (_error) {
        values[key] = incoming || "";
      }
    });
    return values;
  }

  function createEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "muchon-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function pushFormStart(form) {
    if (form.dataset.startTracked === "true") return;
    form.dataset.startTracked = "true";
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "estimate_form_start",
      form_name: "muchon_direct_estimate",
      site_nickname: form.dataset.siteNickname || "",
      page_location: window.location.href
    });
  }

  function pushSuccessfulConversion(form) {
    var eventId = createEventId();
    var attribution = readAttribution();
    var eventData = {
      event: "estimate_form_success",
      event_id: eventId,
      form_name: "muchon_direct_estimate",
      site_nickname: form.dataset.siteNickname || "",
      page_location: window.location.href
    };
    attributionKeys.forEach(function (key) { eventData[key] = attribution[key]; });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(eventData);
    window.dispatchEvent(new CustomEvent("muchon:estimate-success", { detail: eventData }));
  }

  function renderTurnstile(form) {
    if (form.dataset.turnstileRendered === "true") return;
    var container = form.querySelector("[data-turnstile-container]");
    if (!container || !window.turnstile || typeof window.turnstile.render !== "function") {
      window.setTimeout(function () { renderTurnstile(form); }, 250);
      return;
    }
    var widgetId = window.turnstile.render(container, {
      sitekey: config.turnstileSiteKey,
      callback: function () { setStatus(form, "", ""); },
      "expired-callback": function () { setStatus(form, "보안 확인을 다시 완료해주세요.", "error"); },
      "error-callback": function () { setStatus(form, "보안 확인에 실패했습니다. 다시 시도해주세요.", "error"); }
    });
    form.dataset.turnstileRendered = "true";
    form.dataset.turnstileWidgetId = String(widgetId);
  }

  function resetTurnstile(form) {
    if (window.turnstile && typeof window.turnstile.reset === "function" && form.dataset.turnstileWidgetId) {
      window.turnstile.reset(form.dataset.turnstileWidgetId);
    }
  }

  function wireForm(form) {
    if (!form || form.dataset.muchonWired === "true") return;
    var submitButton = form.querySelector('button[type="submit"]');
    form.addEventListener("focusin", function (event) {
      if (event.target && event.target.matches("input, textarea")) pushFormStart(form);
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;

      var nameInput = form.querySelector('[name="name"]');
      var phoneInput = form.querySelector('[name="phone"]');
      var addressInput = form.querySelector('[name="address"]');
      var messageInput = form.querySelector('[name="message"]');
      var privacyInput = form.querySelector('[name="privacy"]');
      var tokenInput = form.querySelector('[name="cf-turnstile-response"]');
      var name = nameInput ? nameInput.value.trim() : "";
      var phone = phoneInput ? phoneInput.value.trim() : "";
      var address = addressInput ? addressInput.value.trim() : "";
      var message = messageInput ? messageInput.value.trim() : "";
      var token = tokenInput ? tokenInput.value.trim() : "";

      if (!name || !phone || !address) { alertStatus(form, "이름, 연락처, 현장 주소를 모두 입력해주세요.", "error"); return; }
      if (!phonePattern.test(phone)) { alertStatus(form, "연락처 형식이 올바르지 않습니다.", "error"); return; }
      if (!privacyInput || !privacyInput.checked) { alertStatus(form, "개인정보 수집 및 이용에 동의해주세요.", "error"); return; }
      if (!token) { alertStatus(form, "보안 확인을 완료해주세요.", "error"); return; }

      form.dataset.submitting = "true";
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = "접수 중..."; }
      setStatus(form, "견적 신청을 안전하게 전송하고 있습니다.", "pending");

      var payload = new URLSearchParams({
        name: name,
        phone: phone,
        address: address,
        message: message,
        pageUrl: window.location.href,
        "cf-turnstile-response": token
      });

      try {
        var response = await fetch(config.appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: payload.toString()
        });
        var result = null;
        try { result = await response.json(); } catch (_jsonError) { result = null; }
        if (!response.ok || !result || result.success !== true) {
          throw new Error(result && result.message ? result.message : "무료 견적 신청 접수에 실패했습니다.");
        }

        pushSuccessfulConversion(form);
        setStatus(form, result.message || "무료 견적 신청이 접수되었습니다.", "success");
        window.alert(result.message || "무료 견적 신청이 접수되었습니다.");
        form.reset();
        if (privacyInput) privacyInput.checked = true;
        resetTurnstile(form);
      } catch (error) {
        alertStatus(form, error && error.message ? error.message : "전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
        resetTurnstile(form);
      } finally {
        form.dataset.submitting = "false";
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = "무료 견적 신청하기"; }
      }
    });

    form.dataset.muchonWired = "true";
    renderTurnstile(form);
  }

  function init() {
    var form = document.getElementById("muchon-estimate-form");
    if (form) wireForm(form);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

let config = null;

const heroDateInput = document.getElementById("heroDate");
const priceInput = document.getElementById("price");
const webinarsDiv = document.getElementById("webinars");
const secretInput = document.getElementById("secret");

fetch("/config")
  .then(res => res.json())
  .then(data => {
    config = data;

    heroDateInput.value = config.heroDate || "";
    priceInput.value = config.price;

    renderWebinars();
  });

function renderWebinars() {
  webinarsDiv.innerHTML = "";

  config.webinars.forEach((w, i) => {
    const div = document.createElement("div");
    div.className = "webinar";

    div.innerHTML = `
      <input placeholder="Дата" value="${w.date}">
      <input placeholder="Время" value="${w.time}">
      <input placeholder="Название" value="${w.title}">
      <textarea placeholder="Описание">${w.description || ""}</textarea>
      <button onclick="removeWebinar(${i})">Удалить</button>
    `;

    webinarsDiv.appendChild(div);
  });
}

function addWebinar() {
  syncWebinarsFromForm(); // ⬅️ ВАЖНО

  config.webinars.push({
    date: "",
    time: "",
    title: "",
    description: ""
  });

  renderWebinars();
}


function removeWebinar(index) {
  syncWebinarsFromForm(); // ⬅️ ВАЖНО

  config.webinars.splice(index, 1);
  renderWebinars();
}


function save() {
  syncWebinarsFromForm();
  const secret = secretInput.value;

  if (!secret) {
    alert("Введите секрет");
    return;
  }

  const webinarNodes = document.querySelectorAll(".webinar");

  const webinars = Array.from(webinarNodes).map(w => {
    const inputs = w.querySelectorAll("input");
    const textarea = w.querySelector("textarea");

    return {
      date: inputs[0].value,
      time: inputs[1].value,
      title: inputs[2].value,
      description: textarea.value

    };
  });

  const newConfig = {
    heroDate: heroDateInput.value,
    price: Number(priceInput.value),
    currency: "RUB",
    webinars
  };

  fetch("/admin/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      config: newConfig
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Сохранено");
      } else {
        alert("Ошибка");
      }
    });
}
function syncWebinarsFromForm() {
  const webinarNodes = document.querySelectorAll(".webinar");

  config.webinars = Array.from(webinarNodes).map(w => {
    const inputs = w.querySelectorAll("input");
    const textarea = w.querySelector("textarea");

    return {
      date: inputs[0].value,
      time: inputs[1].value,
      title: inputs[2].value,
      description: textarea ? textarea.value : ""
    };
  });
}







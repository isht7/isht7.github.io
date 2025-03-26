
let map;
let pathData = [];
let currentPolylines = [];

window.onload = () => {
  document.getElementById("csvFileInput").addEventListener("change", handleCSVUpload);
  document.getElementById("useJsonBtn").addEventListener("click", loadJsonFallback);
};

function handleCSVUpload(e) {
  const file = e.target.files[0];
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function(results) {
      pathData = results.data;
      initMap(pathData);
      populateDropdown(pathData[0]);
    }
  });
}

function loadJsonFallback() {
  fetch("250319_002646.json")
    .then(response => response.json())
    .then(data => {
      pathData = data;
      initMap(pathData);
      populateDropdown(pathData[0]);
    });
}

function initMap(data) {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 18,
    center: { lat: data[0]["Latitude (deg)"], lng: data[0]["Longitude (deg)"] },
    mapTypeId: "satellite"
  });

  drawColoredLine(data, null);
}

function populateDropdown(row) {
  const dropdown = document.getElementById("parameterDropdown");
  dropdown.innerHTML = "<option value=''>-- Select Parameter --</option>";
  for (const key in row) {
    if (key !== "Latitude (deg)" && key !== "Longitude (deg)") {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      dropdown.appendChild(option);
    }
  }

  dropdown.addEventListener("change", () => {
    drawColoredLine(pathData, dropdown.value);
  });
}

function drawColoredLine(data, param) {
  currentPolylines.forEach(polyline => polyline.setMap(null));
  currentPolylines = [];

  //map.setCenter({ lat: data[0]["Latitude (deg)"], lng: data[0]["Longitude (deg)"] });

  if (!param) {
    const polyline = new google.maps.Polyline({
      path: data.map(d => ({ lat: d["Latitude (deg)"], lng: d["Longitude (deg)"] })),
      geodesic: true,
      strokeColor: "#0000FF",
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map: map,
    });
    currentPolylines.push(polyline);
    return;
  }

  const values = data.map(d => d[param]);
  const isNumericColumn = values.every(v => v === null || typeof v === 'number');

  if (isNumericColumn) {
    const filteredValues = values.filter(v => v !== null && !isNaN(v));
    const min = Math.min(...filteredValues);
    const max = Math.max(...filteredValues);

    for (let i = 0; i < data.length - 1; i++) {
      const v1 = data[i][param];
      const v2 = data[i + 1][param];

      const hasNull = (v1 === null || isNaN(v1) || v2 === null || isNaN(v2));
      const color = hasNull ? "#000000" : getColorBlueToRed((v1 - min) / (max - min));

      const segment = new google.maps.Polyline({
        path: [
          { lat: data[i]["Latitude (deg)"], lng: data[i]["Longitude (deg)"] },
          { lat: data[i + 1]["Latitude (deg)"], lng: data[i + 1]["Longitude (deg)"] }
        ],
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map,
      });

      currentPolylines.push(segment);

      const infoWindow = new google.maps.InfoWindow();
      google.maps.event.addListener(segment, 'click', (event) => {
        const content = (v1 === null) ? "Value: N/A" : `${param}: ${v1.toFixed(2)}`;
        infoWindow.setContent(content);
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
    }

    drawLegendWithHistogram(param, values, min, max);
  } else {
    const categories = [...new Set(values.filter(v => v !== null))];
    const colorMap = {};
    categories.forEach((cat, idx) => {
      const hue = (idx * 360 / categories.length) % 360;
      colorMap[cat] = `hsl(${hue}, 80%, 50%)`;
    });

    for (let i = 0; i < data.length - 1; i++) {
      const val = data[i][param];
      const nextVal = data[i + 1][param];

      const hasValid = val !== null && nextVal !== null;
      const color = hasValid ? (colorMap[val] || "#000") : "#000";

      const segment = new google.maps.Polyline({
        path: [
          { lat: data[i]["Latitude (deg)"], lng: data[i]["Longitude (deg)"] },
          { lat: data[i + 1]["Latitude (deg)"], lng: data[i + 1]["Longitude (deg)"] }
        ],
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map,
      });

      currentPolylines.push(segment);

      const infoWindow = new google.maps.InfoWindow();
      google.maps.event.addListener(segment, 'click', (event) => {
        const content = (val === null) ? "Value: N/A" : `${param}: ${val}`;
        infoWindow.setContent(content);
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });
    }

    drawLegendForCategories(param, values, colorMap);
  }
}

function getColorBlueToRed(ratio) {
  const r = Math.floor(255 * ratio);
  const g = 0;
  const b = Math.floor(255 * (1 - ratio));
  return `rgb(${r},${g},${b})`;
}


function drawLegendWithHistogram(param, values, min, max) {
  const legend = document.getElementById("legend");

  const bins = 10;
  const counts = new Array(bins).fill(0);
  let nullCount = 0;

  values.forEach(v => {
    if (v === null || isNaN(v)) {
      nullCount++;
    } else {
      const bin = Math.min(Math.floor((v - min) / (max - min) * bins), bins - 1);
      counts[bin]++;
    }
  });

  const maxCount = Math.max(...counts, nullCount);

  let legendHTML = `
    <strong>${param} Legend</strong>
    <div style="width: 800px; height: 30px; background: linear-gradient(to right, blue, red); border: 1px solid #ccc; margin: 5px 0;"></div>
    <div style="display: flex; justify-content: space-between; width: 800px; font-size: 12px;">
      <span>${min.toFixed(2)}</span>
      <span>${((min + max) / 2).toFixed(2)}</span>
      <span>${max.toFixed(2)}</span>
    </div>
    <strong>Value Distribution</strong>
    <div style="display: grid; grid-template-columns: repeat(${bins + 1}, 1fr); gap: 6px; align-items: end; height: 100px; margin-top: 5px;">
  `;

  counts.forEach(count => {
    const height = Math.round((count / maxCount) * 100);
    legendHTML += `<div style="height: ${height}px; background-color: gray;" title="${count}"></div>`;
  });

  const nullHeight = Math.round((nullCount / maxCount) * 100);
  legendHTML += `<div style="height: ${nullHeight}px; background-color: black;" title="${nullCount}"></div>`;
  legendHTML += `</div>`;

  legendHTML += `<div style="display: grid; grid-template-columns: repeat(${bins + 1}, 1fr); gap: 6px; font-size: 10px; text-align: center; margin-top: 4px;">`;

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * (max - min) / bins;
    const binEnd = min + (i + 1) * (max - min) / bins;
    legendHTML += `<div>${binStart.toFixed(1)}–<br>${binEnd.toFixed(1)}</div>`;
  }

  legendHTML += `<div style="color: black;">NaN</div>`;
  legendHTML += `</div>`;

  legend.innerHTML = legendHTML;
}

function drawLegendForCategories(param, values, colorMap) {
  const legend = document.getElementById("legend");

  const categoryCounts = {};
  let nullCount = 0;

  values.forEach(v => {
    if (v === null) {
      nullCount++;
    } else {
      categoryCounts[v] = (categoryCounts[v] || 0) + 1;
    }
  });

  const allCategories = Object.keys(colorMap);
  const maxCount = Math.max(...Object.values(categoryCounts), nullCount);

  let legendHTML = `
    <strong>${param} Legend</strong>
    <div style="display: grid; grid-template-columns: repeat(${allCategories.length + 1}, 1fr); gap: 6px; align-items: end; height: 100px; margin-top: 5px;">
  `;

  allCategories.forEach(cat => {
    const count = categoryCounts[cat] || 0;
    const height = Math.round((count / maxCount) * 100);
    const color = colorMap[cat];
    legendHTML += `<div style="height: ${height}px; background-color: ${color};" title="${count}"></div>`;
  });

  const nullHeight = Math.round((nullCount / maxCount) * 100);
  legendHTML += `<div style="height: ${nullHeight}px; background-color: black;" title="${nullCount}"></div>`;
  legendHTML += `</div>`;

  legendHTML += `<div style="display: grid; grid-template-columns: repeat(${allCategories.length + 1}, 1fr); gap: 6px; font-size: 10px; text-align: center; margin-top: 4px;">`;
  allCategories.forEach(cat => {
    legendHTML += `<div style="color: ${colorMap[cat]};">${cat}</div>`;
  });
  legendHTML += `<div style="color: black;">NaN</div>`;
  legendHTML += `</div>`;

  legend.innerHTML = legendHTML;
}

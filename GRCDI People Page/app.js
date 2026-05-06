let people = [];
let searchTransitionTimer = null;
let currentView = "directory";
let memberMap = null;
let memberMapMarkers = [];
let memberMapCluster = null;

const locationCoordinates = {
  "University of St Andrews": { lat: 56.3398, lng: -2.7967 },
  "Royal Zoological Society Scotland": { lat: 55.9425, lng: -3.2696 },
  "Emory University, USA": { lat: 33.7971, lng: -84.3222 },
  "Kyoto University, Japan": { lat: 35.0262, lng: 135.7809 },
  "University of St Andrews / University of Bonn": { lat: 56.3398, lng: -2.7967 },
  "University of Osaka, Japan": { lat: 34.822, lng: 135.5247 },
  "Vienna, Austria": { lat: 48.2082, lng: 16.3738 },
  "Universidad Veracruzana, Mexico": { lat: 19.5438, lng: -96.9102 },
  "Macquarie University, Australia": { lat: -33.7753, lng: 151.1129 },
  "University of Edinburgh": { lat: 55.9445, lng: -3.1892 },
  "Indiana University, USA": { lat: 39.167, lng: -86.5343 },
  "UM6P, Morocco": { lat: 32.2352, lng: -7.9539 },
  "Indiana University / Santa Fe Institute, USA": { lat: 39.167, lng: -86.5343 },
  "Emory University / Georgia Institute of Technology, USA": { lat: 33.7756, lng: -84.3963 },
  "Toyota Technological Institute at Chicago, USA": { lat: 41.7897, lng: -87.5987 },
  "Universidad Nacional de Colombia": { lat: 4.6377, lng: -74.0841 },
  "Max Planck Institute for Evolutionary Anthropology, Germany": { lat: 51.3397, lng: 12.3731 },
  "Ritsumeikan University, Japan": { lat: 35.0327, lng: 135.724 },
  "University of Stirling": { lat: 56.1452, lng: -3.9197 },
  "National Autonomous University of Mexico": { lat: 19.3324, lng: -99.188 },
  "Universidade de Lisboa, Portugal": { lat: 38.7527, lng: -9.1569 },
  "MIT, USA": { lat: 42.3601, lng: -71.0942 },
  "Bangalore, India": { lat: 12.9716, lng: 77.5946 },
  "Indiana University, Bloomington, USA": { lat: 39.167, lng: -86.5343 }
};

const locationGeography = {
  "University of St Andrews": { countries: ["United Kingdom"], continents: ["Europe"] },
  "Royal Zoological Society Scotland": { countries: ["United Kingdom"], continents: ["Europe"] },
  "Emory University, USA": { countries: ["United States"], continents: ["North America"] },
  "Kyoto University, Japan": { countries: ["Japan"], continents: ["Asia"] },
  "University of St Andrews / University of Bonn": { countries: ["United Kingdom", "Germany"], continents: ["Europe"] },
  "University of Osaka, Japan": { countries: ["Japan"], continents: ["Asia"] },
  "Vienna, Austria": { countries: ["Austria"], continents: ["Europe"] },
  "Universidad Veracruzana, Mexico": { countries: ["Mexico"], continents: ["North America"] },
  "Macquarie University, Australia": { countries: ["Australia"], continents: ["Oceania"] },
  "University of Edinburgh": { countries: ["United Kingdom"], continents: ["Europe"] },
  "Indiana University, USA": { countries: ["United States"], continents: ["North America"] },
  "UM6P, Morocco": { countries: ["Morocco"], continents: ["Africa"] },
  "Indiana University / Santa Fe Institute, USA": { countries: ["United States"], continents: ["North America"] },
  "Emory University / Georgia Institute of Technology, USA": { countries: ["United States"], continents: ["North America"] },
  "Toyota Technological Institute at Chicago, USA": { countries: ["United States"], continents: ["North America"] },
  "Universidad Nacional de Colombia": { countries: ["Colombia"], continents: ["South America"] },
  "Max Planck Institute for Evolutionary Anthropology, Germany": { countries: ["Germany"], continents: ["Europe"] },
  "Ritsumeikan University, Japan": { countries: ["Japan"], continents: ["Asia"] },
  "University of Stirling": { countries: ["United Kingdom"], continents: ["Europe"] },
  "National Autonomous University of Mexico": { countries: ["Mexico"], continents: ["North America"] },
  "Universidade de Lisboa, Portugal": { countries: ["Portugal"], continents: ["Europe"] },
  "MIT, USA": { countries: ["United States"], continents: ["North America"] },
  "Bangalore, India": { countries: ["India"], continents: ["Asia"] },
  "Indiana University, Bloomington, USA": { countries: ["United States"], continents: ["North America"] }
};

const roleSectionLabels = {
  "Local partner": "Local partners",
  "Global partner": "Global partners"
};

const expertiseAreas = {
  "Comparative cognition": [
    "chimpanzee cognition",
    "cognitive ethology",
    "comparative behaviour",
    "comparative cognitive development",
    "comparative cognition",
    "comparative communication",
    "comparative psychology",
    "dog social cognition",
    "primate cognition",
    "primate behaviour"
  ],
  "Animal behaviour and welfare": [
    "animal cognition",
    "animal behaviour",
    "animal emotion",
    "animal ethics",
    "animal protection activism",
    "avian cognition",
    "ethology",
    "honey bees",
    "insect cognition",
    "nest building",
    "neuroethology",
    "sexual behaviour",
    "tool use",
    "zoo animal welfare"
  ],
  "Development, learning and psychology": [
    "active learning",
    "cognitive development",
    "cognitive control",
    "cognitive diversity",
    "cognitive science",
    "cultural psychology",
    "developmental psychology",
    "developmental science",
    "human cognitive",
    "infant",
    "imitation",
    "joint attention",
    "metacognition",
    "moral development",
    "self-concept",
    "social cognition",
    "specific learning difficulties",
    "theory of mind",
    "working memory"
  ],
  "AI, robotics and computation": [
    "algebra and combinatorics",
    "artificial intelligence",
    "complex systems",
    "computer vision",
    "computational cognitive science",
    "constraint programming",
    "continual learning",
    "cryptography",
    "cognitive vision",
    "domain adaptation",
    "formal models",
    "human activity recognition",
    "human-robot",
    "humanoid robots",
    "information security",
    "machine learning",
    "mathematical modelling",
    "multiagent",
    "optimisation",
    "robot",
    "sensor data",
    "theoretical computer science",
    "video synthesis",
    "vision"
  ],
  "Collective intelligence and culture": [
    "animal culture",
    "collaboration",
    "collective",
    "cooperation",
    "cultural evolution",
    "culture",
    "imitation",
    "social complexity",
    "social learning",
    "technological evolution"
  ],
  "Ecology, conservation and evolution": [
    "bioacoustics",
    "biodiversity",
    "conservation",
    "ecological",
    "ecology",
    "ex-situ",
    "human-nonhuman coexistence",
    "human–nonhuman coexistence",
    "marine mammals",
    "sampling bias"
  ],
  "Philosophy, ethics and consciousness": [
    "agency",
    "argumentation",
    "consciousness",
    "ethics",
    "epistemology",
    "history and conceptual",
    "lived experience",
    "normativity",
    "phenomenology",
    "philosophy",
    "rational",
    "social theory"
  ],
  "Decision making and organisations": [
    "behavioural economics",
    "decision",
    "deliberation",
    "economics",
    "game theory",
    "intuition",
    "judgement",
    "leadership",
    "organisational",
    "social choice",
    "toxic behaviour"
  ],
  "Communication and language": [
    "bilingualism",
    "communication",
    "interspecies communication",
    "language",
    "literature",
    "multilingualism",
    "psycholinguistics",
    "slavic",
    "translation",
    "vocal communication"
  ],
  "Engagement, education and policy": [
    "activism",
    "art",
    "citizen science",
    "conservation education",
    "engagement",
    "environmental practice",
    "impact",
    "inclusive pedagogy",
    "interdisciplinary",
    "nature connectedness",
    "outreach",
    "policy",
    "public",
    "science communication"
  ]
};

fetch("people.json")
  .then(res => res.json())
  .then(data => {
    people = data;
    populateFilters();
    render();
  });

function populateFilters() {
  const locations = new Set();
  const continents = new Set();

  people.forEach(person => {
    const geography = getLocationGeography(person.location);

    locations.add(person.location);
    geography.continents.forEach(continent => continents.add(continent));
  });

  fillSelect("locationFilter", locations);
  fillSelect("continentFilter", continents);
  fillSelect("expertiseFilter", Object.keys(expertiseAreas));
}

function fillSelect(id, values) {
  const select = document.getElementById(id);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

document.getElementById("search").addEventListener("input", renderSearchResults);
document.getElementById("locationFilter").addEventListener("change", renderFilteredResults);
document.getElementById("continentFilter").addEventListener("change", renderFilteredResults);
document.getElementById("expertiseFilter").addEventListener("change", renderFilteredResults);

document.querySelectorAll(".view-button").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;

    document.querySelectorAll(".view-button").forEach(viewButton => {
      const isActive = viewButton === button;
      viewButton.classList.toggle("is-active", isActive);
      viewButton.setAttribute("aria-pressed", String(isActive));
    });

    clearTimeout(searchTransitionTimer);
    render(true);
  });
});

function resetFilters() {
  document.getElementById("search").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("continentFilter").value = "";
  document.getElementById("expertiseFilter").value = "";
  clearTimeout(searchTransitionTimer);
  render();
}

function renderSearchResults() {
  renderFilteredResults();
}

function renderFilteredResults() {
  const activeContainer = currentView === "map"
    ? document.getElementById("mapView")
    : document.getElementById("results");

  clearTimeout(searchTransitionTimer);
  activeContainer.classList.add("is-filtering");

  searchTransitionTimer = setTimeout(() => {
    render(true);
  }, 130);
}

function getFilteredPeople() {
  const search = document.getElementById("search").value.trim().toLowerCase();
  const location = document.getElementById("locationFilter").value;
  const continent = document.getElementById("continentFilter").value;
  const expertise = document.getElementById("expertiseFilter").value;
  const isSearchActive = search.length > 0;

  const results = people.filter(person => {
    const geography = getLocationGeography(person.location);

    return (
      (!location || person.location === location) &&
      (!continent || geography.continents.includes(continent)) &&
      (!expertise || getPersonExpertiseAreas(person).includes(expertise)) &&
      (
        !isSearchActive ||
        person.name.toLowerCase().includes(search) ||
        person.bio.toLowerCase().includes(search) ||
        (person.affiliation || "").toLowerCase().includes(search) ||
        person.expertise.some(item => item.toLowerCase().includes(search)) ||
        (person.links || []).some(link => `${link.label} ${link.url}`.toLowerCase().includes(search)) ||
        geography.countries.some(item => item.toLowerCase().includes(search)) ||
        geography.continents.some(item => item.toLowerCase().includes(search))
      )
    );
  });

  return {
    results,
    isFilteredView: isSearchActive || location || continent || expertise
  };
}

function getPersonExpertiseAreas(person) {
  const sourceText = person.expertise.join(" ").toLowerCase();
  const areas = Object.entries(expertiseAreas)
    .filter(([, keywords]) => keywords.some(keyword => sourceText.includes(keyword)))
    .map(([area]) => area);

  return areas.length ? areas : ["Interdisciplinary and other"];
}

function render(animateCards = false) {
  const { results, isFilteredView } = getFilteredPeople();
  const mapView = document.getElementById("mapView");
  const resultsContainer = document.getElementById("results");

  mapView.hidden = currentView !== "map";
  resultsContainer.hidden = currentView !== "directory";

  if (currentView === "map") {
    renderMap(results, animateCards);
    return;
  }

  renderDirectory(results, isFilteredView, animateCards);
}

function renderDirectory(results, isFilteredView, animateCards = false) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  container.classList.remove("is-filtering");

  if (isFilteredView) {
    const grid = document.createElement("div");
    grid.className = "people-grid";
    results.forEach(person => grid.appendChild(createPersonCard(person, animateCards)));
    container.appendChild(grid);
    revealCards(container, animateCards);
    return;
  }

  const roleGroups = new Map();

  results.forEach(person => {
    if (!roleGroups.has(person.role)) {
      roleGroups.set(person.role, []);
    }

    roleGroups.get(person.role).push(person);
  });

  roleGroups.forEach((groupPeople, groupRole) => {
    const section = document.createElement("section");
    section.className = "role-section";

    const heading = document.createElement("h2");
    heading.textContent = roleSectionLabels[groupRole] || groupRole;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "people-grid";
    groupPeople.forEach(person => grid.appendChild(createPersonCard(person, animateCards)));

    section.appendChild(grid);
    container.appendChild(section);
  });

  revealCards(container, animateCards);
}

function renderMap(results, animateMarkers = false) {
  const container = document.getElementById("mapView");
  const groups = groupPeopleByLocation(results);

  container.innerHTML = `
    <div class="map-layout">
      <div id="memberMap" class="member-map" aria-label="Member locations map"></div>
      <div class="map-list">
        ${groups.map(group => createLocationCard(group, animateMarkers)).join("")}
      </div>
    </div>
  `;

  container.classList.remove("is-filtering");
  renderLeafletMap(groups);

  if (animateMarkers) {
    requestAnimationFrame(() => {
      container.querySelectorAll(".location-card").forEach(item => {
        item.classList.add("is-visible");
      });
    });
  }
}

function groupPeopleByLocation(results) {
  const groups = new Map();

  results.forEach(person => {
    if (!groups.has(person.location)) {
      groups.set(person.location, {
        location: person.location,
        geography: getLocationGeography(person.location),
        coordinates: locationCoordinates[person.location],
        people: []
      });
    }

    groups.get(person.location).people.push(person);
  });

  return [...groups.values()]
    .filter(group => group.coordinates)
    .sort((a, b) => b.people.length - a.people.length || a.location.localeCompare(b.location));
}

function createLocationCard(group, animateMarkers) {
  return `
    <section class="location-card${animateMarkers ? " location-card-enter" : ""}">
      <h2>${escapeHtml(group.location)}</h2>
      <p>${escapeHtml(group.geography.countries.join(" / "))} · ${group.people.length} ${group.people.length === 1 ? "member" : "members"}</p>
      <ul>
        ${group.people.map(person => `<li>${escapeHtml(person.name)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function getLocationGeography(location) {
  return locationGeography[location] || {
    countries: ["Other"],
    continents: ["Other"]
  };
}

function renderLeafletMap(groups) {
  if (!window.L) {
    document.getElementById("memberMap").innerHTML = "<p class=\"map-fallback\">Map tiles could not be loaded.</p>";
    return;
  }

  if (memberMap) {
    memberMap.remove();
  }

  memberMapMarkers = [];
  memberMap = L.map("memberMap", {
    maxZoom: 8,
    scrollWheelZoom: true,
    worldCopyJump: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(memberMap);

  memberMapCluster = L.markerClusterGroup({
    maxClusterRadius: 44,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 7,
    iconCreateFunction: cluster => {
      const childCount = cluster.getAllChildMarkers()
        .reduce((total, marker) => total + marker.options.memberCount, 0);

      return L.divIcon({
        html: `<span>${childCount}</span>`,
        className: "member-cluster-icon",
        iconSize: L.point(42, 42)
      });
    }
  });

  groups.forEach(group => {
    const size = Math.min(54, 26 + group.people.length * 1.2);
    const marker = L.marker([group.coordinates.lat, group.coordinates.lng], {
      memberCount: group.people.length,
      icon: L.divIcon({
        html: `<span>${group.people.length}</span>`,
        className: "member-location-icon",
        iconSize: L.point(size, size)
      })
    });

    marker.bindPopup(`
      <strong>${escapeHtml(group.location)}</strong><br>
      ${group.people.length} ${group.people.length === 1 ? "member" : "members"}<br>
      ${group.people.map(person => escapeHtml(person.name)).join("<br>")}
    `);

    memberMapCluster.addLayer(marker);
    memberMapMarkers.push(marker);
  });

  memberMap.addLayer(memberMapCluster);

  if (memberMapMarkers.length) {
    const bounds = L.featureGroup(memberMapMarkers).getBounds().pad(0.18);
    memberMap.fitBounds(bounds, {
      maxZoom: memberMapMarkers.length === 1 ? 4 : 6
    });
  } else {
    memberMap.setView([20, 0], 2);
  }
}

function revealCards(container, animateCards) {
  if (!animateCards) {
    return;
  }

  requestAnimationFrame(() => {
    container.querySelectorAll(".card").forEach(card => {
      card.classList.add("is-visible");
    });
  });
}

function createPersonCard(person, animateCard = false) {
  const card = document.createElement("article");
  card.className = animateCard ? "card card-enter" : "card";

  const affiliation = person.affiliation || person.location || "";
  const roleLine = person.centreRole || "";
  const bioParagraphs = person.bio
    .split(/\n+/)
    .filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const profileLinks = createProfileLinks(person);

  card.innerHTML = `
    <img class="profile-image" src="${escapeHtml(person.image)}" alt="${escapeHtml(person.name)}">
    <div class="card-body">
      <h3>${escapeHtml(person.name)}</h3>
      ${roleLine ? `<div class="centre-role">${escapeHtml(roleLine)}</div>` : ""}
      <div class="affiliation">${escapeHtml(affiliation)}</div>
      <details class="bio-details">
        <summary>See biography</summary>
        <div class="bio-wrapper">
          <div class="bio">
            ${person.expertise.length ? `<p class="research-areas"><strong>Research areas:</strong> ${person.expertise.map(escapeHtml).join(", ")}</p>` : ""}
            ${bioParagraphs}
            ${profileLinks}
          </div>
        </div>
      </details>
    </div>
  `;

  setupBioDetails(card);

  return card;
}

function createProfileLinks(person) {
  if (!person.links || !person.links.length) {
    return "";
  }

  return `
    <div class="profile-links" aria-label="Profile links">
      ${person.links.map(link => `
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(link.label)}
        </a>
      `).join("")}
    </div>
  `;
}

function setupBioDetails(card) {
  const details = card.querySelector(".bio-details");
  const summary = details.querySelector("summary");
  const wrapper = details.querySelector(".bio-wrapper");

  summary.addEventListener("click", event => {
    event.preventDefault();

    if (details.open) {
      collapseBio(details, wrapper);
    } else {
      expandBio(details, wrapper);
    }
  });
}

function expandBio(details, wrapper) {
  details.open = true;
  wrapper.style.height = "0px";

  requestAnimationFrame(() => {
    wrapper.style.height = `${wrapper.scrollHeight}px`;
  });

  afterBioTransition(wrapper, () => {
    wrapper.style.height = "auto";
  });
}

function collapseBio(details, wrapper) {
  wrapper.style.height = `${wrapper.scrollHeight}px`;

  requestAnimationFrame(() => {
    wrapper.style.height = "0px";
  });

  afterBioTransition(wrapper, () => {
    details.open = false;
    wrapper.style.height = "";
  });
}

function afterBioTransition(wrapper, callback) {
  let finished = false;

  const finish = () => {
    if (finished) {
      return;
    }

    finished = true;
    wrapper.removeEventListener("transitionend", finish);
    callback();
  };

  wrapper.addEventListener("transitionend", finish);
  setTimeout(finish, 260);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

# LLM-Inspired Visualization Interface: A Proof-of-Concept

This project is a functional, web-based proof-of-concept inspired by the research paper **"A Concept for Integrating an LLM-Based Natural Language Interface for Visualizations Grammars"** by Jobst et al. from the Institute of Visual Computing at TU Graz.

The application demonstrates the core idea of translating a user's natural language query into a structured, grammar-constrained JSON object, which is then used to dynamically render a data visualization.

**[➡️ View the Live Demo Here]( https://llm-vis-demo.onrender.com/)**

---

## Core Concept and Features

The goal of this project was to explore the practical challenges of building a reliable Natural Language Interface (NLI) for visualization. While inspired by LLM-based approaches, this implementation uses a **custom, self-contained NLP engine** to ensure reliability and speed, and to demonstrate a first-principles understanding of the task.

-   **Natural Language Input:** A user can describe the chart they want in a simple, intuitive text interface.
-   **Custom Rule-Based NLP Engine:** The Node.js backend features a `parseVisualizationQuery` function that acts as a lightweight NLP engine. It uses keyword scoring, contextual variable extraction, and intelligent title generation to translate the user's query into a structured JSON object.
-   **Grammar-Constrained Output:** The engine's output is designed to always conform to a pre-defined JSON schema that acts as a "visualization grammar," ensuring the output is always valid and predictable.
-   **Dynamic Frontend Rendering:** The vanilla JavaScript frontend uses the popular **Chart.js** library to dynamically render a bar, line, scatter, or area chart based on the received JSON specification.
-   **Context-Aware Sample Data:** To create a more dynamic experience, the frontend generates plausible sample data based on the variable names (`x`, `y`) identified by the backend engine (e.g., generating time-series data if the x-axis is "months").
-   **Transparent and Educational:** The final JSON specification that was used to generate the chart is always displayed, making the internal logic of the system transparent and reinforcing the grammar-based approach.

---

## Technical Stack

-   **Backend:** **Node.js** with the **Express.js** framework.
-   **Frontend:** Vanilla **JavaScript (ES6)**, HTML5, CSS.
-   **Visualization:** **Chart.js** library, loaded via a CDN.
-   **NLP Engine:** A custom, rule-based engine with no external API dependencies.
-   **Deployment:** Hosted as a Web Service on **Render**.

---

## How to Run Locally

1.  **Prerequisites:** You must have [Node.js](https://nodejs.org/) (version 16.x or higher) and npm installed.

2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Cecelia/llm-vis-project.git
    cd your-repo-name
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```
    This will install Express and any other required packages listed in `package.json`.

4.  **Start the Server:**
    ```bash
    node server.js
    ```

5.  **View the Application:**
    Open your web browser and navigate to `http://localhost:3000`. The application should be running.

---

## Project Structure

```
.
├── server.js           # The Node.js/Express backend server and NLP logic
├── index.html          # The main HTML file for the user interface
├── main.js             # Client-side JavaScript for handling user input and rendering charts
├── package.json        # Project metadata and dependencies
└── README.md           # This file
```

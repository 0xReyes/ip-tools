# ip-tools

neat designed to facilitate various network diagnostic checks directly from your web browser. It serves as a versatile toolkit, enabling tasks such as host reachability assessment, route tracing, domain information querying, and much more. 

You can access the live application here: [https://0xreyes.github.io/ip-tools/](https://0xreyes.github.io/ip-tools/)

## Core Capabilities

* **Ping**

* **Traceroute** 

* **Whois** 

* **Dig** 

* **Netcat**

* **Telnet**

* **Nmap**


Simply input a domain or IP address, select your desired tool, and receive precise results promptly.

## Operational Overview

The system operates through an efficient and secure process:

1.  You initiate a diagnostic request directly from the web interface.

2.  This action securely triggers a specialized GitHub Actions workflow in the background.

3.  The workflow then executes your chosen network tool within a dedicated Docker container, ensuring a consistent and isolated environment.

4.  Upon completion, the diagnostic results are securely saved as "artifacts" within your GitHub repository.

5.  Finally, the application retrieves these artifacts and presents the results directly to you. This constitutes a streamlined and reliable workflow.

### Environment Configuration

Before launching the application, ensure the following environment variable is properly configured:

`REACT_APP_API_BASE_URL=https://your-api-proxy.com/api.github.com`


### Installation and Execution

1.  Begin by cloning the repository:

    ```bash
    git clone <your-repo-url>
    ```

2.  Navigate into the project directory.

3.  Install all required project dependencies:

    ```bash
    npm install
    ```

    (Alternatively, if you use Yarn):

    ```bash
    yarn install
    ```

4.  Launch the development server:

    ```bash
    npm start
    ```

    (Or with Yarn):

    ```bash
    yarn start
    ```

    The application should then open in your web browser, typically at `http://localhost:3000`.

### GitHub Integration Details

* **Repository:** `0xReyes/ip-tools`

* **Workflow:** The primary automation logic is defined in `backend-api-trigger.yml`, located within your `.github/workflows/` directory. This workflow orchestrates the execution of the diagnostic tools.

* **API Proxy:** We refer to this as `github-utils-api`. backend service responsible for facilitating secure communication between your application and GitHub Actions.

## API Endpoints Utilized

GitHub API endpoints:

* `POST /repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches` - This endpoint is used to programmatically trigger a GitHub Actions workflow run.

* `GET /repos/{owner}/{repo}/actions/artifacts` - This allows the application to list available artifacts associated with a repository.

* `GET /artifacts/{id}/zip` - This endpoint is used to download specific artifacts by their unique ID, retrieving the diagnostic results.

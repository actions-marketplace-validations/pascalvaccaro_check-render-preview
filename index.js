const { request} = require('node:https');
const { EOL } = require('node:os');

const { GITHUB_TOKEN = '', GITHUB_REPOSITORY = '', INPUT_GITHUB_PR_ID = '', INPUT_SERVICES_ID = ''} = process.env;

function fetch(
	endpoint,
	options = {}
) {
	const body =
		typeof options.body === 'string' ? options.body : JSON.stringify({ data: options.body });
	delete options.body;
	options.headers = {
		...(options.headears || {}),
		Authorization: `Bearer ${GITHUB_TOKEN}`,
		Accept: "application/vnd.github+json",
		"User-Agent": "PostmanRuntime/7.29.2"
	};
	return new Promise((resolve, reject) => {
		let chunks = '';
		const req = request(endpoint, options, (res) => {
			res.setEncoding('utf8');
			res.on('data', (chunk) => (chunks += chunk));
			res.on('error', reject);
			res.on('end', () => {
				try {
					if (res.statusCode >= 400) throw new Error(res.statusMessage);
					const result = JSON.parse(chunks);
					resolve(result);
				} catch (err) {
					reject(err);
				}
			});
		});
		req.on('error', reject);
		req.write(body);
		req.end();
	});
}

function getServices() {
	return INPUT_SERVICES_ID.split('\n').filter(s => s !== '').map(s => s.trim());
}
function setOutput(name, value) {
	process.stdout.write(EOL);
	process.stdout.write("::set-output name=" + name + "::" + value);
	process.stdout.write(EOL);
}
function throwError(message, andExit = true) {
	process.stdout.write(EOL);
	process.stdout.write("::error::" + message);
	process.stdout.write(EOL);
	if (andExit) process.exit(1);
}

async function main() {
	const allDeployments = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments`)
		.then(list => list.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()));

	const services = getServices();
	const latestDeployments = services
		.map(name => allDeployments.find(d => d.original_environment.includes(`${name} PR #${INPUT_GITHUB_PR_ID}`)))
		.filter(Boolean);

	if (latestDeployments.length !== services.length) 
		throwError("There should be " + services.length + " instances deployed, found " + latestDeployments.length);

	let statuses = []
	do {
		if (statuses.length > 0) await new Promise(res => setTimeout(res, 5000));
		statuses = await Promise.all(latestDeployments.map(d => fetch(d.statuses_url)));
	} while (statuses.some(s => s.state === "in_progress"));

	setOutput("env_url", statuses[0].environment_url);
	if (statuses.every(s => s.state === "success")) {
		setOutput("env_status", "success");
	} else {
		throwError(
			`Some deployments were not successful: website = ${statuses[0].state}, admin = ${statuses[1].state}`,
			statuses.some(s => s.state === "failure")
		);
	}
	process.exit(0);
}

main().catch(err => throwError(err.toString()));
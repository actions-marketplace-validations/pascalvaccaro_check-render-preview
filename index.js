const { EOL } = require('node:os');
const { fetch } = require("./utils");
const {
	// Github Actions variables
	GITHUB_REPOSITORY = '',
	// Input variables
	INPUT_BRANCH_NAME = '',
	INPUT_GITHUB_PR_ID = '',
	INPUT_SERVICE_NAME = '',
} = process.env;


async function waitUntil(url, stopMsg, previous = []) {
	if (previous.length > 0) await new Promise(res => setTimeout(res, 5000));
	const next = await fetch(url);
	return next.find(s => stopMsg.includes(s.state)) || waitUntil(url, stopMsg, next);
}

(async function main(repo, refname, service, prId) {
	try {
		const allDeployments = await fetch(`https://api.github.com/repos/${repo}/deployments`)
			.then(list => list.sort((a, b) =>
				new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
			));

		const searchString = `${refname} - ${service} PR #${prId}`;
		const latestDeployment = allDeployments.find(d => d.original_environment === searchString);
		if (!latestDeployment) throw new Error("No deployment found for environment " + searchString);

		const finishStatus = await waitUntil(latestDeployment.statuses_url, ["success", "error", "failure", "inactive"]);

		process.stdout.write(EOL);
		process.stdout.write("::set-output name=env_url::" + finishStatus.environment_url + EOL);
		process.stdout.write("::set-output name=env_status::" + finishStatus.state + EOL);
		process.exit(0);
	} catch (err) {
		process.stdout.write(EOL);
		process.stdout.write("::error::" + err.toString() + EOL);
		process.exit(1);
	}
})(GITHUB_REPOSITORY, INPUT_BRANCH_NAME, INPUT_SERVICE_NAME, INPUT_GITHUB_PR_ID);

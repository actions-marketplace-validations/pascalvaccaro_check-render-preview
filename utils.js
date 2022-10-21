const { request } = require('node:https');
const { GITHUB_TOKEN } = process.env;

exports.fetch = (
	endpoint,
	options = { body: "" }
) => {
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
		if (body) req.write(body);
		req.end();
	});
}

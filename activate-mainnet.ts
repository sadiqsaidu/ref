export {};

async function main(): Promise<void> {
	await import("./scripts/activate-mainnet");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
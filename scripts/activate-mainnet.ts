export {};

async function main(): Promise<void> {
	await import("./activate-mainnet" + ".mts");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
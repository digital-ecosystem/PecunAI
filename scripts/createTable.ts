import { prisma } from '../src/lib/prisma';
import fs from 'fs';
async function main() {
	// create a list from all the advisories in the database
	const advisories = await prisma.partner.findMany();
	fs.writeFileSync('advisories.json', JSON.stringify(advisories, null, 2));
}
main();
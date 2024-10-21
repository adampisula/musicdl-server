import { execSync } from "child_process";

export async function isExecutableAvailable(cmd: string): Promise<boolean> {
    return await new Promise((resolve, _reject) => {
        try {
            execSync(`which ${cmd}`);
            resolve(true);
        } catch (e) {
            resolve(false);
        }
    });
}
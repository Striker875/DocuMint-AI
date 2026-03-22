export async function getRepoStructure(repoUrl: string) {
    // Чистим ссылку от лишних пробелов и слешей
    const cleanUrl = repoUrl.trim().replace(/\/$/, "");
    const urlParts = cleanUrl.replace("https://github.com/", "").split("/");

    if (urlParts.length < 2) {
        throw new Error("Некорректная ссылка на GitHub. Используй формат: https://github.com/user/repo");
    }

    const [owner, repo] = urlParts;

    // Заголовки для авторизации (чтобы не было ошибки 403/500 из-за лимитов)
    const headers: HeadersInit = {
        "Accept": "application/vnd.github.v3+json",
    };

    if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        // 1. Получаем инфо о репозитории, чтобы узнать ветку по умолчанию (main/master)
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

        if (!repoRes.ok) {
            const errorData = await repoRes.json();
            throw new Error(`GitHub Error: ${errorData.message}`);
        }

        const repoData = await repoRes.json();
        const defaultBranch = repoData.default_branch || "main";

        // 2. Получаем дерево файлов
        const treeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            { headers }
        );

        if (!treeRes.ok) {
            throw new Error("Не удалось получить структуру файлов");
        }

        const treeData = await treeRes.json();

        // Фильтруем файлы: убираем мусор вроде node_modules, .git и картинки
        const files = treeData.tree
        .filter((item: any) =>
        item.type === "blob" &&
        !item.path.includes("node_modules/") &&
        !item.path.includes(".git/") &&
        !item.path.match(/\.(png|jpg|jpeg|gif|ico|pdf)$/i)
        )
        .map((item: any) => item.path)
        .slice(0, 60); // Берем первые 60 файлов для контекста

        return files.join("\n");

    } catch (error: any) {
        console.error("Ошибка внутри github.ts:", error.message);
        throw error;
    }
}

export const normalizeRepoUrl = (url: string): string => {
  url = url.trim();

  // already SSH
  if (url.startsWith("git@")) return url;

  // HTTPS → SSH
  if (url.startsWith("https://github.com/")) {
    return url
      .replace("https://github.com/", "git@github.com:")
      .replace(/\.git$/, "") + ".git";
  }

  // fallback (leave as is)
  return url;
};
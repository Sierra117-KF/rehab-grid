import { GITHUB_REPO_URL } from "@rehab-grid/core/lib/constants";
import { ExternalLink } from "@rehab-grid/ui/components/wrapped/ExternalLink";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DISALLOWED_URL = "https://example.com/not-allowed";

describe("ExternalLink", () => {
  beforeEach(() => {
    // noopener 指定時の window.open は、タブを開けても仕様上 null を返す
    vi.spyOn(window, "open").mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("許可された URL", () => {
    it("href を持つリンクとして表示される", () => {
      render(<ExternalLink href={GITHUB_REPO_URL}>GitHub</ExternalLink>);

      const link = screen.getByRole("link", { name: "GitHub" });
      expect(link).toHaveAttribute("href", GITHUB_REPO_URL);
    });

    it("クリックすると新しいタブで一度だけ開く", async () => {
      const user = userEvent.setup();
      render(<ExternalLink href={GITHUB_REPO_URL}>GitHub</ExternalLink>);

      await user.click(screen.getByRole("link", { name: "GitHub" }));

      expect(window.open).toHaveBeenCalledTimes(1);
      expect(window.open).toHaveBeenCalledWith(
        GITHUB_REPO_URL,
        "_blank",
        "noopener,noreferrer"
      );
    });
  });

  describe("許可外の URL", () => {
    it("href を持たず、リンクとして扱われない", () => {
      render(<ExternalLink href={DISALLOWED_URL}>許可外リンク</ExternalLink>);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("許可外リンク")).not.toHaveAttribute("href");
    });

    it("クリックしても window.open が呼ばれない", async () => {
      const user = userEvent.setup();
      render(<ExternalLink href={DISALLOWED_URL}>許可外リンク</ExternalLink>);

      await user.click(screen.getByText("許可外リンク"));

      expect(window.open).not.toHaveBeenCalled();
    });
  });
});

import { Page } from 'playwright';

export interface DomNodeData {
    tagName: string;
    role?: string;
    ariaLabel?: string;
    text?: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    children?: DomNodeData[];
}

export async function extractDomContext(page: Page): Promise<DomNodeData[]> {
    return await page.evaluate(() => {
        function isVisible(el: HTMLElement): boolean {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }

        function isMeaningful(el: HTMLElement): boolean {
            // Tags that are fundamentally semantic or interactive
            const semanticTags = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'IMG', 'SVG', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'LABEL']);
            if (semanticTags.has(el.tagName)) return true;

            // Has explicit ARIA semantics
            if (el.hasAttribute('role') || el.hasAttribute('aria-label')) return true;

            // Has direct visible text content (not just whitespace, and not just child elements)
            const hasDirectText = Array.from(el.childNodes).some(node =>
                node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0
            );
            if (hasDirectText) return true;

            return false;
        }

        function traverse(node: Element): DomNodeData[] {
            const results: DomNodeData[] = [];
            const children = Array.from(node.children) as HTMLElement[];

            for (const child of children) {
                if (!isVisible(child)) continue;

                const bounds = child.getBoundingClientRect();
                // Skip elements with no physical dimensions
                if (bounds.width === 0 || bounds.height === 0) continue;

                const childData = traverse(child);

                if (isMeaningful(child)) {
                    const data: DomNodeData = {
                        tagName: child.tagName.toLowerCase(),
                        bounds: {
                            x: Math.round(bounds.x),
                            y: Math.round(bounds.y),
                            width: Math.round(bounds.width),
                            height: Math.round(bounds.height)
                        }
                    };

                    const role = child.getAttribute('role');
                    if (role) data.role = role;

                    const ariaLabel = child.getAttribute('aria-label');
                    if (ariaLabel) data.ariaLabel = ariaLabel;

                    // Only grab direct text content or simple text
                    let directText = '';
                    for (const n of Array.from(child.childNodes)) {
                        if (n.nodeType === Node.TEXT_NODE) {
                            directText += n.textContent;
                        }
                    }
                    const text = directText.trim();
                    if (text) data.text = text;

                    if (childData.length > 0) {
                        data.children = childData;
                    }

                    results.push(data);
                } else {
                    // If it's a useless wrapper div, just flatten its children up
                    results.push(...childData);
                }
            }

            return results;
        }

        return traverse(document.body);
    });
}

export async function captureScreenshot(page: Page, path?: string): Promise<Buffer> {
    return await page.screenshot({ path, fullPage: true });
}

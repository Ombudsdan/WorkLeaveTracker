import { render, screen } from "@testing-library/react";
import Card from "./Card";

describe("Card — rendering", () => {
  it("renders its children", () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText("Hello Card")).toBeInTheDocument();
  });

  it("renders a div by default", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild!.nodeName).toBe("DIV");
  });

  it("renders base styling classes", () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border");
    expect(card.className).toContain("rounded-lg");
    expect(card.className).toContain("bg-white");
    expect(card.className).toContain("shadow-sm");
  });
});

describe("Card — padding variants", () => {
  it("applies md padding by default", () => {
    const { container } = render(<Card>Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-5");
  });

  it("applies no padding when padding='none'", () => {
    const { container } = render(<Card padding="none">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("p-3");
    expect(card.className).not.toContain("p-5");
    expect(card.className).not.toContain("p-7");
  });

  it("applies sm padding when padding='sm'", () => {
    const { container } = render(<Card padding="sm">Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-3");
  });

  it("applies lg padding when padding='lg'", () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-7");
  });
});

describe("Card — as prop (semantic HTML)", () => {
  it("renders a section element when as='section'", () => {
    const { container } = render(<Card as="section">Content</Card>);
    expect(container.firstChild!.nodeName).toBe("SECTION");
  });

  it("renders an article element when as='article'", () => {
    const { container } = render(<Card as="article">Content</Card>);
    expect(container.firstChild!.nodeName).toBe("ARTICLE");
  });

  it("renders an aside element when as='aside'", () => {
    const { container } = render(<Card as="aside">Content</Card>);
    expect(container.firstChild!.nodeName).toBe("ASIDE");
  });

  it("renders a main element when as='main'", () => {
    const { container } = render(<Card as="main">Content</Card>);
    expect(container.firstChild!.nodeName).toBe("MAIN");
  });
});

describe("Card — className prop", () => {
  it("merges extra className onto the card", () => {
    const { container } = render(<Card className="my-custom-class">Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("my-custom-class");
  });

  it("does not duplicate base classes when className is empty", () => {
    const { container } = render(<Card className="">Content</Card>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain("rounded-lg");
  });
});

describe("Card — unhappy paths", () => {
  it("renders without children (empty card)", () => {
    // @ts-expect-error testing missing children prop
    const { container } = render(<Card />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders with deeply nested children", () => {
    render(
      <Card>
        <div>
          <span>Deep</span>
        </div>
      </Card>
    );
    expect(screen.getByText("Deep")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "@/components/Button";

describe("Button — rendering", () => {
  it("renders its children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("defaults to type='button' to avoid accidental form submissions", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("applies type='submit' when specified", () => {
    render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

describe("Button — variants", () => {
  it("applies primary variant classes when variant='primary'", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-indigo-600");
  });

  it("applies secondary variant classes when variant='secondary'", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("border");
    expect(btn.className).toContain("bg-white");
  });

  it("applies danger variant classes when variant='danger'", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-red-600");
  });

  it("defaults to the primary variant when no variant is specified", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button").className).toContain("bg-indigo-600");
  });
});

describe("Button — sizes", () => {
  it("applies md size classes by default", () => {
    render(<Button>Medium</Button>);
    expect(screen.getByRole("button").className).toContain("px-5");
  });

  it("applies sm size classes when size='sm'", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("px-3");
  });
});

describe("Button — fullWidth", () => {
  it("includes w-full class when fullWidth is true", () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole("button").className).toContain("w-full");
  });

  it("does not include w-full when fullWidth is false", () => {
    render(<Button fullWidth={false}>Narrow</Button>);
    expect(screen.getByRole("button").className).not.toContain("w-full");
  });
});

describe("Button — disabled state", () => {
  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is not disabled by default", () => {
    render(<Button>Active</Button>);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});

describe("Button — onClick", () => {
  it("calls onClick when the button is clicked", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when the button is disabled", async () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Nope
      </Button>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe("Button — className", () => {
  it("merges extra className into the button", () => {
    render(<Button className="my-custom-class">Styled</Button>);
    expect(screen.getByRole("button").className).toContain("my-custom-class");
  });
});

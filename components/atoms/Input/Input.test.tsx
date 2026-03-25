import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";

describe("Input — rendering", () => {
  it("renders an input element", () => {
    render(<Input aria-label="name" />);
    expect(screen.getByRole("textbox", { name: "name" })).toBeInTheDocument();
  });

  it("defaults to type='text'", () => {
    render(<Input aria-label="test" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("applies a given id", () => {
    render(<Input id="my-input" aria-label="test" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "my-input");
  });

  it("renders placeholder text", () => {
    render(<Input aria-label="test" placeholder="Enter value" />);
    expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument();
  });
});

describe("Input — type variants", () => {
  it("renders type='email'", () => {
    render(<Input type="email" aria-label="email" />);
    expect(document.querySelector("input[type='email']")).toBeInTheDocument();
  });

  it("renders type='password'", () => {
    render(<Input type="password" aria-label="password" />);
    expect(document.querySelector("input[type='password']")).toBeInTheDocument();
  });

  it("renders type='number'", () => {
    render(<Input type="number" aria-label="quantity" />);
    expect(document.querySelector("input[type='number']")).toBeInTheDocument();
  });

  it("renders type='date'", () => {
    render(<Input type="date" aria-label="date" />);
    expect(document.querySelector("input[type='date']")).toBeInTheDocument();
  });

  it("renders type='search'", () => {
    render(<Input type="search" aria-label="search" />);
    expect(document.querySelector("input[type='search']")).toBeInTheDocument();
  });

  it("renders type='tel'", () => {
    render(<Input type="tel" aria-label="phone" />);
    expect(document.querySelector("input[type='tel']")).toBeInTheDocument();
  });

  it("renders type='url'", () => {
    render(<Input type="url" aria-label="website" />);
    expect(document.querySelector("input[type='url']")).toBeInTheDocument();
  });
});

describe("Input — controlled value", () => {
  it("displays a controlled value", () => {
    render(<Input aria-label="name" value="Alice" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("Alice");
  });

  it("calls onChange when the user types", async () => {
    const handleChange = jest.fn();
    render(<Input aria-label="name" value="" onChange={handleChange} />);
    await userEvent.type(screen.getByRole("textbox"), "B");
    expect(handleChange).toHaveBeenCalled();
  });
});

describe("Input — disabled state", () => {
  it("is disabled when disabled prop is true", () => {
    render(<Input aria-label="test" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("is not disabled by default", () => {
    render(<Input aria-label="test" />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("applies disabled styling classes", () => {
    render(<Input aria-label="test" disabled />);
    expect(screen.getByRole("textbox").className).toContain("opacity-50");
    expect(screen.getByRole("textbox").className).toContain("cursor-not-allowed");
  });

  it("does not call onChange when disabled (unhappy path)", async () => {
    const handleChange = jest.fn();
    render(<Input aria-label="test" disabled value="" onChange={handleChange} />);
    await userEvent.type(screen.getByRole("textbox"), "abc");
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("Input — readOnly state", () => {
  it("sets readOnly attribute when readOnly is true", () => {
    render(<Input aria-label="test" readOnly value="fixed" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
  });

  it("applies readOnly background class", () => {
    render(<Input aria-label="test" readOnly value="fixed" />);
    expect(screen.getByRole("textbox").className).toContain("bg-gray-50");
  });

  it("applies white background when not readOnly", () => {
    render(<Input aria-label="test" value="editable" onChange={() => {}} />);
    expect(screen.getByRole("textbox").className).toContain("bg-white");
  });
});

describe("Input — aria-invalid (validation state)", () => {
  it("applies error border class when aria-invalid is true", () => {
    render(<Input aria-label="test" aria-invalid />);
    expect(screen.getByRole("textbox").className).toContain("border-red-400");
  });

  it("applies normal border class when aria-invalid is false", () => {
    render(<Input aria-label="test" aria-invalid={false} />);
    expect(screen.getByRole("textbox").className).toContain("border-gray-300");
  });

  it("applies normal border when aria-invalid is omitted", () => {
    render(<Input aria-label="test" />);
    expect(screen.getByRole("textbox").className).toContain("border-gray-300");
  });
});

describe("Input — required attribute", () => {
  it("marks the input as required when required is true", () => {
    render(<Input aria-label="test" required />);
    expect(screen.getByRole("textbox")).toBeRequired();
  });

  it("is not required by default", () => {
    render(<Input aria-label="test" />);
    expect(screen.getByRole("textbox")).not.toBeRequired();
  });
});

describe("Input — min/max/step/maxLength constraints", () => {
  it("sets min attribute", () => {
    render(<Input type="number" aria-label="qty" min={1} />);
    expect(document.querySelector("input")).toHaveAttribute("min", "1");
  });

  it("sets max attribute", () => {
    render(<Input type="number" aria-label="qty" max={100} />);
    expect(document.querySelector("input")).toHaveAttribute("max", "100");
  });

  it("sets step attribute as a number", () => {
    render(<Input type="number" aria-label="qty" step={0.5} />);
    expect(document.querySelector("input")).toHaveAttribute("step", "0.5");
  });

  it("sets step attribute as 'any'", () => {
    render(<Input type="number" aria-label="qty" step="any" />);
    expect(document.querySelector("input")).toHaveAttribute("step", "any");
  });

  it("sets maxLength attribute", () => {
    render(<Input aria-label="name" maxLength={50} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "50");
  });
});

describe("Input — className prop", () => {
  it("merges extra className onto the input", () => {
    render(<Input aria-label="test" className="my-custom-class" />);
    expect(screen.getByRole("textbox").className).toContain("my-custom-class");
  });
});

describe("Input — accessibility attributes", () => {
  it("sets aria-describedby attribute", () => {
    render(<Input aria-label="test" aria-describedby="helper-text" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "helper-text");
  });

  it("fires onChange with a change event when value changes", () => {
    const handleChange = jest.fn();
    render(<Input aria-label="test" value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    // Verify the handler received a React synthetic event object
    expect(handleChange.mock.calls[0][0]).toHaveProperty("target");
  });
});

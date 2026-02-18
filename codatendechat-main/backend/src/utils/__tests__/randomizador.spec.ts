import { randomizarCaminho } from "../randomizador";

describe("randomizarCaminho", () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(global.Math, "random");
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("should return 'A' when Math.random() is less than the chance", () => {
    // If chance is 0.5, and random returns 0.4, it should be A
    randomSpy.mockReturnValue(0.4);
    const result = randomizarCaminho(0.5);
    expect(result).toBe("A");
  });

  it("should return 'B' when Math.random() is greater than the chance", () => {
    // If chance is 0.5, and random returns 0.6, it should be B
    randomSpy.mockReturnValue(0.6);
    const result = randomizarCaminho(0.5);
    expect(result).toBe("B");
  });

  it("should return 'B' when Math.random() is equal to the chance", () => {
    // If chance is 0.5, and random returns 0.5, it should be B
    // condition is: if (random < chance) return A else return B
    randomSpy.mockReturnValue(0.5);
    const result = randomizarCaminho(0.5);
    expect(result).toBe("B");
  });

  it("should always return 'A' if chance is 1.0", () => {
      randomSpy.mockReturnValue(0.99999);
      expect(randomizarCaminho(1.0)).toBe("A");
  });

  it("should always return 'B' if chance is 0.0", () => {
      randomSpy.mockReturnValue(0.00001);
      expect(randomizarCaminho(0.0)).toBe("B");
  });
});

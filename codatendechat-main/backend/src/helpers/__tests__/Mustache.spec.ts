import Mustache, { greeting, firstName } from "../Mustache";

describe("Mustache Helper", () => {
  describe("greeting", () => {
    afterAll(() => {
      jest.useRealTimers();
    });

    it("should return 'Boa madrugada' when time is between 00:00 and 05:59", () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T00:00:00"));
      expect(greeting()).toBe("Boa madrugada");

      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T05:59:59"));
      expect(greeting()).toBe("Boa madrugada");
    });

    it("should return 'Bom dia' when time is between 06:00 and 11:59", () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T06:00:00"));
      expect(greeting()).toBe("Bom dia");

      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T11:59:59"));
      expect(greeting()).toBe("Bom dia");
    });

    it("should return 'Boa tarde' when time is between 12:00 and 17:59", () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T12:00:00"));
      expect(greeting()).toBe("Boa tarde");

      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T17:59:59"));
      expect(greeting()).toBe("Boa tarde");
    });

    it("should return 'Boa noite' when time is between 18:00 and 23:59", () => {
      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T18:00:00"));
      expect(greeting()).toBe("Boa noite");

      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T23:59:59"));
      expect(greeting()).toBe("Boa noite");
    });
  });

  describe("firstName", () => {
    it("should return the first name from a full name", () => {
      const contact = { name: "John Doe" } as any;
      expect(firstName(contact)).toBe("John");
    });

    it("should return the name if it is a single word", () => {
      const contact = { name: "John" } as any;
      expect(firstName(contact)).toBe("John");
    });

    it("should return an empty string if contact is undefined", () => {
      expect(firstName(undefined)).toBe("");
    });

    it("should return an empty string if contact name is undefined", () => {
      const contact = {} as any;
      expect(firstName(contact)).toBe("");
    });
  });

  describe("default export (render)", () => {
    afterAll(() => {
      jest.useRealTimers();
    });

    it("should render the body with replaced variables", () => {
      const body = "Hello {{firstName}}, {{gretting}}. It is {{ms}}.";
      const contact = { name: "John Doe" } as any;

      jest.useFakeTimers().setSystemTime(new Date("2023-01-01T10:00:00")); // 10 AM -> Bom dia

      const result = Mustache(body, contact);

      // Note: typo 'gretting' in source code
      expect(result).toBe("Hello John, Bom dia. It is Bom dia.");
    });

    it("should verify 'ms' variable logic matches expected greeting logic", () => {
        const body = "{{ms}}";
        const contact = { name: "Test" } as any;

        // 04:00 -> Boa madrugada
        jest.useFakeTimers().setSystemTime(new Date("2023-01-01T04:00:00"));
        expect(Mustache(body, contact)).toBe("Boa madrugada");

        // 08:00 -> Bom dia
        jest.useFakeTimers().setSystemTime(new Date("2023-01-01T08:00:00"));
        expect(Mustache(body, contact)).toBe("Bom dia");

        // 14:00 -> Boa tarde
        jest.useFakeTimers().setSystemTime(new Date("2023-01-01T14:00:00"));
        expect(Mustache(body, contact)).toBe("Boa tarde");

        // 20:00 -> Boa noite
        jest.useFakeTimers().setSystemTime(new Date("2023-01-01T20:00:00"));
        expect(Mustache(body, contact)).toBe("Boa noite");
    });

    it("should format protocol and hora correctly", () => {
        const body = "Protocol: {{protocol}}, Time: {{hora}}";
        const contact = { name: "Test" } as any;
        // 2023-01-02 15:04:05
        jest.useFakeTimers().setSystemTime(new Date("2023-01-02T15:04:05"));

        const result = Mustache(body, contact);

        expect(result).toBe("Protocol: 20230102150405, Time: 15:04:05");
    });
  });
});

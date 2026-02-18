import UpdateFlowBuilderService from "../UpdateFlowBuilderService";
import { FlowBuilderModel } from "../../../models/FlowBuilder";

// Mock the dependencies
jest.mock("../../../models/FlowBuilder");

describe("UpdateFlowBuilderService", () => {
  const mockFlowId = 1;
  const mockCompanyId = 1;
  const mockName = "Test Flow";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update flow when name does not exist", async () => {
    // Mock findOne to return null (name does not exist)
    (FlowBuilderModel.findOne as jest.Mock).mockResolvedValue(null);
    // Mock update to succeed
    (FlowBuilderModel.update as jest.Mock).mockResolvedValue([1]);

    const result = await UpdateFlowBuilderService({
      companyId: mockCompanyId,
      name: "New Name",
      flowId: mockFlowId,
    });

    expect(result).toBe("ok");
    expect(FlowBuilderModel.findOne).toHaveBeenCalledWith({
      where: { name: "New Name", company_id: mockCompanyId },
    });
    expect(FlowBuilderModel.update).toHaveBeenCalledWith(
      { name: "New Name" },
      { where: { id: mockFlowId, company_id: mockCompanyId } }
    );
  });

  it("should fail to update flow if name exists on another flow", async () => {
    // Mock findOne to return a DIFFERENT flow
    (FlowBuilderModel.findOne as jest.Mock).mockResolvedValue({
      id: 999, // Different ID
      name: "Existing Name",
      company_id: mockCompanyId,
    });

    const result = await UpdateFlowBuilderService({
      companyId: mockCompanyId,
      name: "Existing Name",
      flowId: mockFlowId,
    });

    expect(result).toBe("exist");
    expect(FlowBuilderModel.update).not.toHaveBeenCalled();
  });

  it("should allow updating flow with same name", async () => {
    // Mock findOne to return the flow itself
    (FlowBuilderModel.findOne as jest.Mock).mockResolvedValue({
      id: mockFlowId,
      name: mockName,
      company_id: mockCompanyId,
    });
    (FlowBuilderModel.update as jest.Mock).mockResolvedValue([1]);

    const result = await UpdateFlowBuilderService({
      companyId: mockCompanyId,
      name: mockName,
      flowId: mockFlowId,
    });

    expect(result).toBe("ok");
  });
});

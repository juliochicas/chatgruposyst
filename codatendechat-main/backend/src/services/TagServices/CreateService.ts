import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";

interface Request {
  name: string;
  color: string;
  kanban: number;
  companyId: number;
  parentId?: number;
  promptId?: number;
  shopifyConnectionId?: number;
}

const CreateService = async ({
  name,
  color = "#A4CCCC",
  kanban = 0,
  companyId,
  parentId,
  promptId,
  shopifyConnectionId
}: Request): Promise<Tag> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(3)
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const [tag] = await Tag.findOrCreate({
    where: { name, color, companyId, kanban },
    defaults: {
      name, color, companyId, kanban,
      parentId: parentId || null,
      promptId: promptId || null,
      shopifyConnectionId: shopifyConnectionId || null
    }
  });

  await tag.reload();

  return tag;
};

export default CreateService;

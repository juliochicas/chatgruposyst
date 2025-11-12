import AppError from "../../errors/AppError";
import Channel from "../../models/Channel";
import ShowChannelService from "../../services/ChannelService/ShowChannelService";
import { ChannelAdapter } from "./ChannelAdapter";
import WhatsappChannelAdapter from "./WhatsappChannelAdapter";
import MetaChannelAdapter from "./MetaChannelAdapter";

class ChannelManager {
  private static adapters = new Map<number, ChannelAdapter>();

  static async getAdapter(
    channelId: number,
    companyId: number
  ): Promise<ChannelAdapter> {
    if (this.adapters.has(channelId)) {
      return this.adapters.get(channelId);
    }

    const channel = await ShowChannelService({ channelId, companyId });
    const adapter = this.instantiateAdapter(channel);

    this.adapters.set(channel.id, adapter);
    return adapter;
  }

  static clear(channelId?: number): void {
    if (channelId) {
      this.adapters.delete(channelId);
      return;
    }
    this.adapters.clear();
  }

  private static instantiateAdapter(channel: Channel): ChannelAdapter {
    const type = channel.type?.toLowerCase();

    if (type === "whatsapp") {
      return new WhatsappChannelAdapter(channel);
    }

    if (type && type.startsWith("instagram")) {
      return new MetaChannelAdapter(channel);
    }

    if (type && type.startsWith("facebook")) {
      return new MetaChannelAdapter(channel);
    }

    throw new AppError("ERR_CHANNEL_ADAPTER_NOT_IMPLEMENTED");
  }
}

export default ChannelManager;


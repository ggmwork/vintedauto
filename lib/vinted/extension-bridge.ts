import {
  getConfiguredVintedExtensionId,
  isVintedExtensionLaunchResponse,
  VINTED_EXTENSION_MESSAGE_TYPES,
  type VintedExtensionLaunchRequest,
  type VintedExtensionLaunchResponse,
} from "@/lib/vinted/extension-protocol";

interface ChromeRuntimeLike {
  lastError?: {
    message?: string;
  };
  sendMessage(
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ): void;
}

declare global {
  interface Window {
    chrome?: {
      runtime?: ChromeRuntimeLike;
    };
  }
}

export type VintedExtensionBridgeLaunchResult =
  | {
      status: "launched";
      response: VintedExtensionLaunchResponse;
    }
  | {
      status: "fallback";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function toMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function shouldFallbackFromBridgeError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("receiving end does not exist") ||
    normalizedMessage.includes("could not establish connection") ||
    normalizedMessage.includes("extension messaging is not available")
  );
}

function sendExternalMessage<T>(
  extensionId: string,
  message: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const runtime = window.chrome?.runtime;

    if (!runtime?.sendMessage) {
      reject(
        new Error("Extension messaging is not available in this browser context.")
      );
      return;
    }

    runtime.sendMessage(extensionId, message, (response) => {
      const runtimeError = window.chrome?.runtime?.lastError;

      if (runtimeError?.message) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(response as T);
    });
  });
}

export async function launchVintedHandoffViaExtension(input: {
  draftId: string;
  appOrigin: string;
}): Promise<VintedExtensionBridgeLaunchResult> {
  const extensionId = getConfiguredVintedExtensionId();

  if (!extensionId) {
    return {
      status: "fallback",
      message: "No Vinted extension ID is configured in the app yet.",
    };
  }

  const message: VintedExtensionLaunchRequest = {
    type: VINTED_EXTENSION_MESSAGE_TYPES.launchHandoff,
    draftId: input.draftId,
    appOrigin: input.appOrigin,
  };

  try {
    const response = await sendExternalMessage<unknown>(extensionId, message);

    if (isVintedExtensionLaunchResponse(response)) {
      return {
        status: "launched",
        response,
      };
    }

    if (
      response &&
      typeof response === "object" &&
      "ok" in response &&
      (response as { ok?: boolean }).ok === false
    ) {
      const errorResponse = response as { message?: unknown };

      if (typeof errorResponse.message !== "string") {
        return {
          status: "error",
          message: "Extension returned an invalid error response.",
        };
      }

      return {
        status: "error",
        message: errorResponse.message,
      };
    }

    return {
      status: "error",
      message: "Extension returned an invalid launch response.",
    };
  } catch (error) {
    const message = toMessage(
      error,
      "Extension bridge launch failed for an unknown reason."
    );

    if (shouldFallbackFromBridgeError(message)) {
      return {
        status: "fallback",
        message,
      };
    }

    return {
      status: "error",
      message,
    };
  }
}

package com.sangsikhanip.app;

import android.content.ComponentName;
import android.net.Uri;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.concurrent.Executor;
import java.util.function.Consumer;

/** JS bridge to {@link StoryPlaybackService}: load, play, pause, seek, speed and state. */
@CapacitorPlugin(name = "StoryPlayer")
public class StoryPlayerPlugin extends Plugin {

    private MediaController controller;
    private ListenableFuture<MediaController> pending;

    private final Player.Listener listener = new Player.Listener() {
        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            notifyListeners("state", state(controller));
        }

        @Override
        public void onPlaybackStateChanged(int playbackState) {
            notifyListeners("state", state(controller));
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            JSObject data = state(controller);
            data.put("error", error.getMessage());
            notifyListeners("state", data);
        }
    };

    private Executor main() {
        return ContextCompat.getMainExecutor(getContext());
    }

    /** Runs the action on the main thread with a connected controller. */
    private void withController(PluginCall call, Consumer<MediaController> action) {
        main().execute(() -> {
            if (controller != null) {
                action.accept(controller);
                return;
            }
            if (pending == null) {
                SessionToken token = new SessionToken(getContext(), new ComponentName(getContext(), StoryPlaybackService.class));
                pending = new MediaController.Builder(getContext(), token).buildAsync();
            }
            pending.addListener(() -> {
                try {
                    if (controller == null) {
                        controller = pending.get();
                        controller.addListener(listener);
                    }
                    action.accept(controller);
                } catch (Exception e) {
                    pending = null;
                    call.reject("플레이어를 열지 못했어요", e);
                }
            }, main());
        });
    }

    private static JSObject state(MediaController c) {
        JSObject data = new JSObject();
        if (c == null) return data;
        long duration = c.getDuration();
        data.put("position", Math.max(0, c.getCurrentPosition()) / 1000.0);
        data.put("duration", duration > 0 ? duration / 1000.0 : 0);
        data.put("playing", c.isPlaying());
        data.put("buffering", c.getPlaybackState() == Player.STATE_BUFFERING);
        data.put("ended", c.getPlaybackState() == Player.STATE_ENDED);
        data.put("rate", c.getPlaybackParameters().speed);
        return data;
    }

    @PluginMethod
    public void load(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url이 필요해요");
            return;
        }
        MediaMetadata meta = new MediaMetadata.Builder()
            .setTitle(call.getString("title", ""))
            .setArtist(call.getString("artist", "상식플러스"))
            .build();
        MediaItem item = new MediaItem.Builder().setUri(Uri.parse(url)).setMediaMetadata(meta).build();
        double start = call.getDouble("start", 0.0);
        withController(call, (c) -> {
            c.setMediaItem(item, (long) (start * 1000));
            c.prepare();
            if (call.getBoolean("autoplay", true)) c.play();
            call.resolve(state(c));
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        withController(call, (c) -> {
            if (c.getPlaybackState() == Player.STATE_ENDED) c.seekTo(0);
            c.play();
            call.resolve(state(c));
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        withController(call, (c) -> {
            c.pause();
            call.resolve(state(c));
        });
    }

    @PluginMethod
    public void seek(PluginCall call) {
        double position = call.getDouble("position", 0.0);
        withController(call, (c) -> {
            c.seekTo((long) (position * 1000));
            call.resolve(state(c));
        });
    }

    @PluginMethod
    public void setRate(PluginCall call) {
        float rate = call.getFloat("rate", 1f);
        withController(call, (c) -> {
            c.setPlaybackSpeed(rate);
            call.resolve(state(c));
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        withController(call, (c) -> {
            c.stop();
            c.clearMediaItems();
            call.resolve(state(c));
        });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        withController(call, (c) -> call.resolve(state(c)));
    }

    @Override
    protected void handleOnDestroy() {
        if (controller != null) {
            controller.removeListener(listener);
            controller.release();
            controller = null;
        }
        if (pending != null) {
            MediaController.releaseFuture(pending);
            pending = null;
        }
    }
}

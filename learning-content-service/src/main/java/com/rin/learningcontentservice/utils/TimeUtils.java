package com.rin.learningcontentservice.utils;



public class TimeUtils {
    private TimeUtils() {
        /* This utility class should not be instantiated */
    }

    private static final int MS_IN_SECOND = 1000;

    public static Integer toMs(Double seconds) {
        if (seconds == null) {
            return null;
        }
        return (int) Math.round(seconds * MS_IN_SECOND);
    }
}

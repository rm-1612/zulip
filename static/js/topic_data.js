var topic_data = (function () {

var exports = {};

var stream_dict = new Dict(); // stream_id -> array of objects

exports.stream_has_topics = function (stream_id) {
    return stream_dict.has(stream_id);
};

exports.topic_history = function () {
    var topics = new Dict({fold_case: true});

    var self = {};

    self.add_or_update = function (opts) {
        var name = opts.name;
        var message_id = opts.message_id || 0;

        message_id = parseInt(message_id, 10);

        var existing = topics.get(name);

        if (!existing) {
            topics.set(opts.name, {
                message_id: message_id,
                pretty_name: name,
                count: 1,
            });
            return;
        }

        existing.count += 1;
        if (message_id > existing.message_id) {
            existing.message_id = message_id;
            existing.pretty_name = name;
        }
    };

    self.maybe_remove = function (topic_name) {
        var existing = topics.get(topic_name);

        if (!existing) {
            return;
        }

        if (existing.count <= 1) {
            topics.del(topic_name);
            return;
        }

        existing.count -= 1;
    };

    self.get_recent_names = function () {
        var recents = topics.values();

        recents.sort(function (a, b) {
            return b.message_id - a.message_id;
        });

        var names = _.map(recents, function (obj) {
            return obj.pretty_name;
        });

        return names;
    };

    return self;
};

exports.process_message = function (message, remove_message) {
    if (remove_message) {
        exports.remove_message({
            stream_id: message.stream_id,
            topic_name: message.subject,
        });
        return;
    }

    exports.add_message({
        stream_id: message.stream_id,
        topic_name: message.subject,
        message_id: message.id,
    });
};

exports.remove_message = function (opts) {
    var stream_id = opts.stream_id;
    var name = opts.topic_name;
    var history = stream_dict.get(stream_id);

    // This is the special case of "removing" a message from
    // a topic, which happens when we edit topics.

    if (!history) {
        return;
    }

    // This is the normal case of an incoming message.
    history.maybe_remove(name);
};

exports.find_or_create = function (stream_id) {
    var history = stream_dict.get(stream_id);

    if (!history) {
        history = exports.topic_history();
        stream_dict.set(stream_id, history);
    }

    return history;
};

exports.add_message = function (opts) {
    var stream_id = opts.stream_id;
    var message_id = opts.message_id;
    var name = opts.topic_name;

    var history = exports.find_or_create(stream_id);

    history.add_or_update({
        name: name,
        message_id: message_id,
    });
};

exports.get_recent_names = function (stream_id) {
    var history = stream_dict.get(stream_id);

    if (!history) {
        return [];
    }

    return history.get_recent_names();
};

exports.reset = function () {
    // This is only used by tests.
    stream_dict = new Dict();
};

return exports;

}());
if (typeof module !== 'undefined') {
    module.exports = topic_data;
}
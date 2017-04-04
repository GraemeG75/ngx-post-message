import {
    Inject,
    Injectable,
    NgZone,
    EventEmitter
} from '@angular/core';

import {
    PostMessageBusSource,
    PostMessageBusSink
} from './PostMessageBus';

import {LoggerFactory, ILogger} from 'ts-smart-logger/index';

import {IPostMessageBridge} from './IPostMessageBridge';
import {IPostMessage} from './IPostMessage';
import {IPostMessageEventTarget} from './IPostMessageEventTarget';

@Injectable()
export class PostMessageBridgeImpl implements IPostMessageBridge {

    private static logger:ILogger = LoggerFactory.makeLogger(PostMessageBridgeImpl);

    private busSource:PostMessageBusSource;
    private busSink:PostMessageBusSink;

    private _sources:Map<string, EventEmitter<any>> = new Map<string, EventEmitter<any>>();
    private _targets:Map<string, EventEmitter<any>> = new Map<string, EventEmitter<any>>();

    private loggingEnable:boolean = true;

    constructor(@Inject(NgZone) private ngZone:NgZone) {
    }

    /**
     * @override
     */
    public connect(source:IPostMessageEventTarget, target:IPostMessageEventTarget, targetOrigin?:string):IPostMessageBridge {
        targetOrigin = targetOrigin || "*";

        this.busSource = new PostMessageBusSource(source);
        this.busSource.attachToZone(this.ngZone);

        this.busSink = new PostMessageBusSink({

            postMessage: (messages:IPostMessage[]):void => {
                if (source !== target) {
                    target.postMessage(messages, targetOrigin);

                    if (this.loggingEnable) {
                        PostMessageBridgeImpl.logger.debug(`[$PostMessageBridgeImpl] The messages`, messages, `were sent from the source`, source, `to the target`, target);
                    }
                } else {
                    if (this.loggingEnable) {
                        PostMessageBridgeImpl.logger.warn(`[$PostMessageBridgeImpl] It's impossible to send the messages `, messages, ` because the source and the target are equal! The source is`, source);
                    }
                }
            }
        });
        this.busSink.attachToZone(this.ngZone);

        if (this.loggingEnable) {
            PostMessageBridgeImpl.logger.debug(`[$PostMessageBridgeImpl] The bridge service was successfully initiated for the target origin '${targetOrigin}'.`);
        }
        return this;
    }

    /**
     * @override
     */
    public makeBridge(bridgeName:string):IPostMessageBridge {
        this.busSource.initChannel(bridgeName, true);
        this._sources.set(bridgeName, this.busSource.from(bridgeName));

        this.busSink.initChannel(bridgeName, true);
        this._targets.set(bridgeName, this.busSink.to(bridgeName));

        if (this.loggingEnable) {
            PostMessageBridgeImpl.logger.debug(`[$PostMessageBridgeImpl] The bridge '${bridgeName}' was successfully registered.`);
        }
        return this;
    }

    /**
     * @override
     */
    public sendMessage(bridgeName:string, message?:any):IPostMessageBridge {
        this._targets.get(bridgeName).emit(message);
        return this;
    }

    /**
     * @override
     */
    public addListener(bridgeName:string, listener:Function):IPostMessageBridge {
        this._sources.get(bridgeName).subscribe(listener);
        return this;
    }

    /**
     * @override
     */
    public setEnableLogging(enabled:boolean):IPostMessageBridge {
        this.loggingEnable = enabled;
        return this;
    }
}

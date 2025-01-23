import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    BaseEntity,
} from "typeorm"

export enum TipoAsueto {
    algunos,
    todos,
}

@Entity()
export class Asueto extends BaseEntity{
    @PrimaryGeneratedColumn()
    id:number;
    @Column({type: 'date', nullable: true})
    fecha: Date;
    @Column()
    nombre:string
    @Column()
    tipo:TipoAsueto
    @Column()
    descripcion:string
}
